import json
from app.adapters.llm import call_llm_json
from app.db import supabase

with open("app/prompts/summary_demo.txt") as f:
    SUMMARY_SYSTEM_PROMPT = f.read()


def generate_summary(session_id: str) -> dict:
    """Read transcript from DB, call LLM, return compressed summary."""
    # Fetch the transcript
    result = supabase.table("transcripts").select("turns").eq("session_id", session_id).execute()
    if not result.data or not result.data[0].get("turns"):
        return _fallback_summary()

    turns = result.data[0]["turns"]

    # Only send answered turns (filter out pending questions with no answer)
    answered = [{"q": t["q"], "a": t["a"]} for t in turns if t.get("a") is not None]
    if not answered:
        return _fallback_summary()

    user_message = json.dumps(answered, ensure_ascii=False)

    try:
        summary = call_llm_json(SUMMARY_SYSTEM_PROMPT, user_message)
        # Validate the shape — must have "points" array
        if not isinstance(summary.get("points"), list) or len(summary["points"]) == 0:
            print("  WARNING — LLM returned summary without valid points array, using fallback")
            return _fallback_summary()
        return summary
    except Exception as e:
        print(f"  WARNING — Summary generation failed ({type(e).__name__}: {e}), using fallback")
        return _fallback_summary()


def _fallback_summary() -> dict:
    """Return a minimal summary when AI generation fails."""
    return {
        "points": [
            {
                "en": "Interview completed — summary generation failed. Please review transcript.",
                "hi": "Interview ho gaya — summary nahi ban paya. Transcript dekh lein."
            }
        ],
        "red_flags": []
    }
