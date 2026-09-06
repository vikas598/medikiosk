from fastapi import APIRouter, HTTPException, UploadFile, File
from app.db import supabase
from app.schema import VerifyHandoffRequest, VerifyHandoffResponse
from app.routers.kiosk import HANDOFFS_DB
from app.services.summary import generate_summary
import uuid

router = APIRouter(prefix="/mobile", tags=["mobile"])

@router.post("/document-handoff/verify")
def verify_handoff(req: VerifyHandoffRequest):
    handoff = HANDOFFS_DB.get(req.handoff_token)
    if not handoff:
        raise HTTPException(status_code=404, detail="Handoff not found")
    
    if handoff["status"] == "claimed":
        raise HTTPException(status_code=400, detail="Handoff already claimed")
    
    session_id = handoff["session_id"]
    
    # Verify the patient token matches the session
    result = supabase.table("intake_sessions").select("token").eq("id", session_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session_token = result.data[0]["token"]
    
    if session_token != req.patient_token:
        raise HTTPException(status_code=403, detail="Invalid patient token")
        
    # Mark as claimed
    HANDOFFS_DB[req.handoff_token]["status"] = "claimed"
    
    upload_claim_token = str(uuid.uuid4())
    HANDOFFS_DB[req.handoff_token]["upload_claim_token"] = upload_claim_token
    
    return {
        "status": "verified",
        "upload_claim_token": upload_claim_token
    }

@router.post("/upload")
async def upload_document(handoff_token: str, file: UploadFile = File(...)):
    handoff = HANDOFFS_DB.get(handoff_token)
    if not handoff or handoff["status"] != "claimed":
        raise HTTPException(status_code=403, detail="Invalid or unclaimed handoff")
        
    session_id = handoff["session_id"]
    
    # Validate MIME type
    allowed_types = ["image/jpeg", "image/png", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Unsupported file type")
        
    # Read file
    content = await file.read()
    
    # 5MB size limit
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
        
    # Upload to Supabase Storage
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else ''
    storage_path = f"{session_id}/{uuid.uuid4()}.{file_ext}"
    
    try:
        supabase.storage.from_("medical-documents").upload(
            file=content,
            path=storage_path,
            file_options={"content-type": file.content_type}
        )
    except Exception as e:
        print(f"Supabase storage upload error: {e}")
        raise HTTPException(status_code=500, detail="Storage bucket error. Ensure 'medical-documents' bucket exists in Supabase.")
        
    # Save metadata in documents table
    try:
        supabase.table("documents").insert({
            "session_id": session_id,
            "filename": file.filename,
            "file_type": file.content_type,
            "storage_path": storage_path,
            "size": len(content)
        }).execute()
    except Exception as e:
        print(f"Supabase documents table error: {e}")
        raise HTTPException(status_code=500, detail="Database table error. Ensure 'documents' table exists in Supabase.")

    # Documents are uploaded after interview finalization, so refresh the existing
    # session summary now that this document is available to the summary pipeline.
    transcript = supabase.table("transcripts").select("turns").eq("session_id", session_id).execute()
    if transcript.data and transcript.data[0].get("turns"):
        summary = generate_summary(session_id)
        supabase.table("summaries").upsert({
            "session_id": session_id,
            "structured": summary,
            "status": "draft"
        }, on_conflict="session_id").execute()

    return {"status": "ok", "message": "File uploaded successfully"}
