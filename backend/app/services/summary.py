import json
from app.adapters.llm import call_llm_json
from app.db import supabase
from app.services.document_extraction import (
    days_since_document_date,
    extract_document_date,
    extract_document_text,
)

with open("app/prompts/summary_demo.txt") as f:
    SUMMARY_SYSTEM_PROMPT = f.read()


def generate_summary(session_id: str) -> dict:
    """Read transcript from DB, call LLM, return compressed summary."""
    # Fetch the transcript and documents for this same intake session.
    result = supabase.table("transcripts").select("turns").eq("session_id", session_id).execute()
    if not result.data or not result.data[0].get("turns"):
        return _fallback_summary()

    turns = result.data[0]["turns"]

    # Only send answered turns (filter out pending questions with no answer)
    answered = [{"q": t["q"], "a": t["a"]} for t in turns if t.get("a") is not None]
    if not answered:
        return _fallback_summary()

    documents_result = (
        supabase.table("documents")
        .select("filename, file_type, storage_path")
        .eq("session_id", session_id)
        .execute()
    )
    document_information = []
    for document in documents_result.data or []:
        storage_path = document.get("storage_path")
        if not storage_path:
            continue
        try:
            content = supabase.storage.from_("medical-documents").download(storage_path)
            text = extract_document_text(content, document.get("file_type"), document.get("filename"))
            if text:
                document_date = extract_document_date(text)
                document_information.append({
                    "filename": document.get("filename"),
                    "document_date": document_date,
                    "days_ago": days_since_document_date(document_date),
                    "text": text,
                })
        except Exception as e:
            print(f"  WARNING — Document extraction failed for {document.get('filename')}: {type(e).__name__}: {e}")

    user_message = json.dumps({
        "patient_interview_transcript": answered,
        "medical_document_information": document_information or "No readable medical documents were uploaded.",
    }, ensure_ascii=False)

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
