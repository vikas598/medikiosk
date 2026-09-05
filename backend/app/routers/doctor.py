from fastapi import APIRouter, HTTPException
from app.db import supabase
from app.schema import ApproveRequest, UpdateSummaryRequest

router = APIRouter(prefix="/doctor", tags=["doctor"])


def _extract_patient(session_row):
    patient = session_row.get("patients") or {}
    if isinstance(patient, list):
        patient = patient[0] if patient else {}
    return {
        "id": patient.get("id"),
        "name": patient.get("name") or "Unknown Patient",
        "age": patient.get("age"),
        "gender": patient.get("gender"),
        "phone": patient.get("phone"),
    }


@router.get("/queue")
def get_queue():
    result = supabase.table("intake_sessions").select("*, patients(*), summaries(*)").order("priority_flag", desc=True).order("started_at").execute()
    rows = result.data or []
    active_rows = [row for row in rows if row.get("state") not in (None, "expired")]
    patients = []

    for row in active_rows:
        summary = row.get("summaries") or []
        if isinstance(summary, list):
            summary_row = summary[0] if summary else None
        else:
            summary_row = summary

        patients.append({
            "session_id": row.get("id"),
            "token": row.get("token"),
            "state": row.get("state"),
            "priority_flag": bool(row.get("priority_flag", False)),
            "priority_reason": row.get("priority_reason"),
            "started_at": row.get("started_at"),
            "completed_at": row.get("completed_at"),
            "patient": _extract_patient(row),
            "summary_status": (summary_row or {}).get("status") if summary_row else None,
        })

    return {"patients": patients, "total_count": len(patients)}


@router.get("/sessions/{session_id}")
def get_session_detail(session_id: str):
    session = supabase.table("intake_sessions").select("*, patients(*)").eq("id", session_id).execute()
    if not session.data:
        raise HTTPException(status_code=404)

    session_row = session.data[0]
    transcript = supabase.table("transcripts").select("*").eq("session_id", session_id).execute()
    summary = supabase.table("summaries").select("*").eq("session_id", session_id).execute()
    documents_query = supabase.table("documents").select("*").eq("session_id", session_id).order("created_at", desc=True).execute()

    transcript_data = (transcript.data[0] if transcript.data else {"turns": []})
    summary_row = summary.data[0] if summary.data else None
    summary_data = (summary_row or {}).get("structured") if summary_row else None
    if summary_data is None:
        summary_data = summary_row
    documents = []
    for doc in documents_query.data or []:
        signed_url = None
        storage_path = doc.get("storage_path")
        if storage_path:
            try:
                result = supabase.storage.from_("medical-documents").create_signed_url(storage_path, 3600)
                if isinstance(result, dict):
                    signed_url = result.get("signedURL") or result.get("signed_url") or result.get("url")
                    if isinstance(signed_url, dict):
                        signed_url = signed_url.get("url") or signed_url.get("signedURL")
                    if not signed_url and isinstance(result.get("data"), dict):
                        signed_url = result["data"].get("signedURL") or result["data"].get("signed_url") or result["data"].get("url")
                elif isinstance(result, list) and result:
                    first = result[0]
                    if isinstance(first, dict):
                        signed_url = first.get("signedURL") or first.get("signed_url") or first.get("url")
            except Exception:
                signed_url = None

        documents.append({
            "id": doc.get("id"),
            "session_id": doc.get("session_id"),
            "filename": doc.get("filename"),
            "file_type": doc.get("file_type"),
            "storage_path": storage_path,
            "size": doc.get("size"),
            "uploaded_at": doc.get("uploaded_at") or doc.get("created_at"),
            "url": signed_url,
        })

    return {
        "session_id": session_row.get("id"),
        "token": session_row.get("token"),
        "state": session_row.get("state"),
        "priority_flag": bool(session_row.get("priority_flag", False)),
        "priority_reason": session_row.get("priority_reason"),
        "patient": _extract_patient(session_row),
        "transcript": transcript_data,
        "summary": summary_data,
        "documents": documents,
    }


@router.patch("/sessions/{session_id}/summary")
def update_summary(session_id: str, req: UpdateSummaryRequest):
    summary_result = supabase.table("summaries").select("structured").eq("session_id", session_id).execute()
    if not summary_result.data:
        raise HTTPException(status_code=404, detail="Summary not found for this session.")

    summary_row = summary_result.data[0]
    current_structured = summary_row.get("structured") or {}
    updated_structured = req.structured.model_dump()
    doctor_edits = {
        key: {"before": current_structured.get(key), "after": value}
        for key, value in updated_structured.items()
        if current_structured.get(key) != value
    }

    supabase.table("summaries").update({
        "structured": updated_structured,
        "doctor_edits": doctor_edits,
    }).eq("session_id", session_id).execute()

    return {"status": "ok", "doctor_edits": doctor_edits}


@router.post("/sessions/{session_id}/approve")
def approve(session_id: str, req: ApproveRequest):
    session_result = supabase.table("intake_sessions").select("state").eq("id", session_id).execute()
    if not session_result.data:
        raise HTTPException(status_code=404, detail="Patient session not found.")
    if session_result.data[0].get("state") == "approved":
        return {"status": "ok", "session_state": "approved"}

    update_data = {"status": "approved"}
    if req.edits:
        update_data["doctor_edits"] = req.edits

    summary_result = supabase.table("summaries").select("id").eq("session_id", session_id).execute()
    if summary_result.data:
        supabase.table("summaries").update(update_data).eq("session_id", session_id).execute()

    supabase.table("intake_sessions").update({"state": "approved"}).eq("id", session_id).execute()
    return {"status": "ok", "session_state": "approved"}
