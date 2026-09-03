from fastapi import APIRouter, HTTPException
from app.db import supabase
from app.schema import ApproveRequest

router = APIRouter(prefix="/doctor", tags=["doctor"])

@router.get("/queue")
def get_queue():
    # Get all sessions with summary_ready state
    result = supabase.table("intake_sessions").select(
        "*, patients(*), summaries(*)"
    ).eq("state", "summary_ready").order("priority_flag", desc=True).order("started_at").execute()
    return result.data

@router.get("/sessions/{session_id}")
def get_session_detail(session_id: str):
    session = supabase.table("intake_sessions").select("*, patients(*)").eq("id", session_id).execute()
    if not session.data:
        raise HTTPException(status_code=404)
    
    transcript = supabase.table("transcripts").select("*").eq("session_id", session_id).execute()
    summary = supabase.table("summaries").select("*").eq("session_id", session_id).execute()
    
    return {
        "session": session.data[0],
        "transcript": transcript.data[0] if transcript.data else None,
        "summary": summary.data[0] if summary.data else None
    }


@router.post("/sessions/{session_id}/approve")
def approve(session_id: str, req: ApproveRequest):
    update_data = {"status": "approved"}
    if req.edits:
        update_data["doctor_edits"] = req.edits
    supabase.table("summaries").update(update_data).eq("session_id", session_id).execute()
    supabase.table("intake_sessions").update({"state": "approved"}).eq("id", session_id).execute()
    return {"status": "ok"}
