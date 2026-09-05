import json
from datetime import datetime
from app.adapters.llm import call_llm, call_llm_json
from app.db import supabase

with open("app/prompts/interview.txt") as f:
    INTERVIEW_SYSTEM_PROMPT = f.read()

MIN_QUESTIONS = 6
MAX_QUESTIONS = 8

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
    except Exception as e:
        # Fallback if LLM fails for ANY reason (rate limit, timeout, bad JSON, etc.)
        print(f"  WARNING — LLM call failed ({type(e).__name__}: {e}), using fallback question")
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
        except Exception:
            pass
    
    # --- HARD GUARD: enforce minimum question count ---
    answered_count = len([t for t in turns if t.get("a") is not None])
    print(f"  [interview] questions answered so far: {answered_count}, is_complete: {parsed.get('is_complete')}")

    if answered_count < MIN_QUESTIONS:
        # LLM tried to finish too early — override
        parsed["is_complete"] = False
        if not parsed.get("question"):
            # LLM returned no question either — force it to generate one
            force_msg = (
                f"{user_message}\n\n"
                f"You have only asked {answered_count} questions so far. "
                f"The MINIMUM is {MIN_QUESTIONS}. You MUST ask the next question. "
                "Pick the next uncovered interview section and ask about it."
            )
            try:
                forced = call_llm_json(INTERVIEW_SYSTEM_PROMPT, force_msg)
                if forced.get("question"):
                    parsed = forced
                    parsed["is_complete"] = False
                else:
                    parsed["question"] = "Do you have any other health concerns you'd like to mention?"
                    parsed["touch_options"] = ["Haan", "Nahi"]
            except Exception:
                parsed["question"] = "Do you have any other health concerns you'd like to mention?"
                parsed["touch_options"] = ["Haan", "Nahi"]

    # If we've hit the max, force completion
    if answered_count >= MAX_QUESTIONS and not parsed.get("is_complete"):
        parsed["is_complete"] = True
        parsed["question"] = None

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
