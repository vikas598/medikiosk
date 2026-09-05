import json
from datetime import datetime
from app.adapters.llm import call_llm, call_llm_json
from app.db import supabase

with open("app/prompts/interview.txt") as f:
    INTERVIEW_SYSTEM_PROMPT = f.read()

def _question_key(question: str) -> str:
    return " ".join(question.lower().split()).rstrip("?.!")


def process_turn(session_id: str, patient_response: str) -> dict:
    # Get transcript
    result = supabase.table("transcripts").select("*").eq("session_id", session_id).execute()
    turns = result.data[0]["turns"] if result.data else []
    
    # If not first turn, append patient's response to last question
    if turns:
        turns[-1]["a"] = patient_response
    else:
        # First turn — patient response is to the initial "What brings you here?"
        turns = [{"q": "What brings you to the hospital today?", "a": patient_response, "timestamp": datetime.now().isoformat()}]
    
    # Call LLM for next question
    user_message = f"Conversation so far:\n{json.dumps(turns, indent=2)}\n\nGenerate the next question."
    try:
        parsed = call_llm_json(INTERVIEW_SYSTEM_PROMPT, user_message)
    except (TypeError, json.JSONDecodeError):
        # Fallback if LLM returns non-JSON
        parsed = {"question": "Can you tell me more about that?", "touch_options": [], "is_complete": False, "red_flags": []}

    answered_questions = {
        _question_key(turn["q"])
        for turn in turns
        if turn.get("a") is not None
    }
    if parsed.get("question") and _question_key(parsed["question"]) in answered_questions:
        retry_message = (
            f"{user_message}\n\n"
            "The proposed question repeats one that was already answered. "
            "Choose the next uncovered interview section and return a different question."
        )
        try:
            retry = call_llm_json(INTERVIEW_SYSTEM_PROMPT, retry_message)
            if retry.get("question") and _question_key(retry["question"]) not in answered_questions:
                parsed = retry
        except (TypeError, json.JSONDecodeError):
            pass
    
    # Save red flags if detected
    if parsed.get("red_flags"):
        supabase.table("intake_sessions").update({
            "priority_flag": True,
            "priority_reason": parsed["red_flags"][0]["reason"]
        }).eq("id", session_id).execute()
    
    if parsed.get("is_complete"):
        # Save final turns and mark ready for summary
        if result.data:
            supabase.table("transcripts").update({"turns": turns}).eq("session_id", session_id).execute()
        else:
            supabase.table("transcripts").insert({"session_id": session_id, "turns": turns}).execute()
        return {"question": None, "is_complete": True}
    
    # Add next question to turns (as pending, without answer yet)
    turns.append({"q": parsed["question"], "a": None, "timestamp": datetime.now().isoformat()})
    
    # Update transcript
    if result.data:
        supabase.table("transcripts").update({"turns": turns}).eq("session_id", session_id).execute()
    else:
        supabase.table("transcripts").insert({"session_id": session_id, "turns": turns}).execute()
    
    return {
        "question": parsed["question"],
        "touch_options": parsed.get("touch_options", []),
        "is_complete": False
    }
