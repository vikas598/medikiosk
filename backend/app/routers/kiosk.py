from fastapi import APIRouter, HTTPException
from app.db import supabase
from datetime import datetime

from app.schema import TurnRequest, ConsentRequest 

router = APIRouter(prefix="/kiosk", tags=["kiosk"])

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

# Interview turn (HARDCODED response for Day 1)
HARDCODED_QUESTIONS = [
    "What brings you to the hospital today?",
    "How long have you been experiencing this?",
    "On a scale of 1 to 10, how severe is it?",
    "Have you taken any medication for this?",
    "Do you have any other symptoms?",
]

@router.post("/sessions/{session_id}/interview/turn")
def interview_turn(session_id: str, req: TurnRequest):
    # Fetch transcript
    result = supabase.table("transcripts").select("*").eq("session_id", session_id).execute()
    
    if not result.data:
        # First turn — create transcript
        supabase.table("transcripts").insert({
            "session_id": session_id,
            "turns": [{"q": HARDCODED_QUESTIONS[0], "a": req.response, "timestamp": datetime.now().isoformat()}]
        }).execute()
        supabase.table("intake_sessions").update({"state": "interviewing"}).eq("id", session_id).execute()
        next_q_idx = 1
    else:
        turns = result.data[0]["turns"]
        turns.append({"q": HARDCODED_QUESTIONS[len(turns)], "a": req.response, "timestamp": datetime.now().isoformat()})
        supabase.table("transcripts").update({"turns": turns}).eq("session_id", session_id).execute()
        next_q_idx = len(turns)
    
    if next_q_idx >= len(HARDCODED_QUESTIONS):
        return {"question": None, "is_complete": True}
    
    return {
        "question": HARDCODED_QUESTIONS[next_q_idx],
        "touch_options": [],
        "is_complete": False
    }

# Finalize — generate hardcoded summary
@router.post("/sessions/{session_id}/finalize")
def finalize(session_id: str):
    hardcoded_summary = {
        "chief_complaint": "Chest pain for 2 days",
        "hpi": "Patient reports intermittent chest pain, 6/10 severity, no radiation",
        "pmh": "No significant past medical history",
        "drug_history": "None",
        "allergy_history": "NKDA",
        "family_history": "Father — hypertension",
        "personal_history": "Non-smoker, occasional alcohol",
        "ros": "No fever, no dyspnea, no palpitations"
    }
    supabase.table("summaries").insert({
        "session_id": session_id,
        "structured": hardcoded_summary,
        "status": "draft"
    }).execute()
    supabase.table("intake_sessions").update({"state": "summary_ready"}).eq("id", session_id).execute()
    return {"status": "ok", "summary": hardcoded_summary}
