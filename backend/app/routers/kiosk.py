import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from app.db import supabase
from datetime import datetime

from app.adapters.llm import call_llm_json
from app.adapters.deepgram import transcribe_audio
from app.schema import TurnRequest, ConsentRequest
from app.services.interview import process_turn
from app.services.summary import generate_summary

router = APIRouter(prefix="/kiosk", tags=["kiosk"])
INTERVIEW_SYSTEM_PROMPT = (
    Path(__file__).resolve().parents[1] / "prompts" / "interview.txt"
).read_text(encoding="utf-8")

# Get session by token
@router.get("/sessions/{token}")
def get_session_by_token(token: str):
    result = supabase.table("intake_sessions").select("*, patients(*)").eq("token", token).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Token not found")
    session = result.data[0]
    # Check expiry
    if datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00")) < datetime.now(tz=None).astimezone():
        raise HTTPException(status_code=410, detail="Token expired")
    return session

# Record consent
@router.post("/sessions/{session_id}/consent")
def record_consent(session_id: str, req: ConsentRequest):
    supabase.table("consents").insert({
        "session_id": session_id,
        "granted": req.granted,
    }).execute()
    
    if req.granted:
        supabase.table("intake_sessions").update({"state": "consented"}).eq("id", session_id).execute()
    else:
        supabase.table("intake_sessions").update({"state": "expired"}).eq("id", session_id).execute()
    
    return {"status": "ok"}

# def get_next_question(turns: list[dict]) -> dict:
#     """Generate the next interview turn from the stored transcript."""
#     try:
#         result = call_llm_json(
#             system_prompt=INTERVIEW_SYSTEM_PROMPT,
#             user_message=json.dumps(turns, ensure_ascii=False),
#         )
#     except Exception as exc:
#         raise HTTPException(status_code=502, detail="Interview AI is unavailable") from exc

#     if not isinstance(result.get("question"), (str, type(None))):
#         raise HTTPException(status_code=502, detail="Interview AI returned invalid question data")

#     return {
#         "question": result.get("question"),
#         "touch_options": result.get("touch_options", []),
#         "is_complete": bool(result.get("is_complete", False)),
#     }

# @router.post("/sessions/{session_id}/interview/turn")
# def interview_turn(session_id: str, req: TurnRequest):
#     # Fetch transcript
#     result = supabase.table("transcripts").select("*").eq("session_id", session_id).execute()

#     turns = result.data[0]["turns"] if result.data else []
#     turns.append({
#         "q": req.question or "",
#         "a": req.response,
#         "timestamp": datetime.now().isoformat(),
#     })

#     if not result.data:
#         supabase.table("transcripts").insert({
#             "session_id": session_id,
#             "turns": turns,
#         }).execute()
#         supabase.table("intake_sessions").update({"state": "interviewing"}).eq("id", session_id).execute()
#     else:
#         supabase.table("transcripts").update({"turns": turns}).eq("session_id", session_id).execute()

#     return get_next_question(turns)

@router.post("/sessions/{session_id}/interview/turn")
def interview_turn(session_id: str, req: TurnRequest):
    return process_turn(session_id, req.response)


# Transcribe patient audio to text
@router.post("/sessions/{session_id}/transcribe")
def transcribe(session_id: str, audio: UploadFile = File(...)):
    audio_bytes = audio.file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="No audio data received")
    try:
        text = transcribe_audio(audio_bytes, audio.content_type or "audio/webm")
    except Exception as e:
        print(f"  WARNING — Transcription failed ({type(e).__name__}: {e})")
        raise HTTPException(status_code=502, detail="Transcription failed. Please try again.")
    return {"text": text}


# Finalize — generate AI summary from transcript
@router.post("/sessions/{session_id}/finalize")
def finalize(session_id: str):
    summary = generate_summary(session_id)
    supabase.table("summaries").upsert({
        "session_id": session_id,
        "structured": summary,
        "status": "draft"
    }, on_conflict="session_id").execute()
    supabase.table("intake_sessions").update({"state": "summary_ready"}).eq("id", session_id).execute()
    return {"status": "ok", "summary": summary}

# In-memory store for handoffs (since we might not have a handoffs table)
HANDOFFS_DB = {}
import uuid

@router.post("/sessions/{session_id}/document-handoff")
def create_document_handoff(session_id: str):
    handoff_token = str(uuid.uuid4())
    # In a real app we'd store this in DB with expiration
    HANDOFFS_DB[handoff_token] = {
        "session_id": session_id,
        "status": "pending",
        "created_at": datetime.now().isoformat()
    }
    return {
        "handoff_token": handoff_token,
        "expires_at": "2099-12-31T23:59:59Z"
    }

@router.get("/document-handoff/{handoff_token}/status")
def get_handoff_status(handoff_token: str):
    if handoff_token not in HANDOFFS_DB:
        raise HTTPException(status_code=404, detail="Handoff not found")
    
    return {"status": HANDOFFS_DB[handoff_token]["status"]}
