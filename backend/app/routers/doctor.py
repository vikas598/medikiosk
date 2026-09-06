from fastapi import APIRouter, HTTPException, Query
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


def _signed_url(storage_path):
    if not storage_path:
        return None
    try:
        result = supabase.storage.from_("medical-documents").create_signed_url(storage_path, 3600)
        if isinstance(result, dict):
            signed_url = result.get("signedURL") or result.get("signed_url") or result.get("url")
            if isinstance(signed_url, dict):
                signed_url = signed_url.get("url") or signed_url.get("signedURL")
            if not signed_url and isinstance(result.get("data"), dict):
                signed_url = result["data"].get("signedURL") or result["data"].get("signed_url") or result["data"].get("url")
            return signed_url
        if isinstance(result, list) and result and isinstance(result[0], dict):
            return result[0].get("signedURL") or result[0].get("signed_url") or result[0].get("url")
    except Exception:
        return None
    return None


@router.get("/queue")
def get_queue(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    result = (
        supabase.table("intake_sessions")
        .select("*, patients(*), summaries(*)", count="exact")
        .not_.is_("state", "null")
        .neq("state", "expired")
        .order("priority_flag", desc=True)
        .order("started_at", desc=True)
        .execute()
    )
    rows = result.data or []
    rows_by_patient = {}
    for row in rows:
        patient = _extract_patient(row)
        patient_id = patient.get("id") or row.get("patient_id") or row.get("id")
        rows_by_patient.setdefault(patient_id, []).append(row)

    unique_rows = []
    for patient_rows in rows_by_patient.values():
        latest = patient_rows[0]
        flagged_row = next((row for row in patient_rows if row.get("priority_flag")), None)
        if flagged_row:
            latest = {
                **latest,
                "priority_flag": True,
                "priority_reason": flagged_row.get("priority_reason") or latest.get("priority_reason"),
            }
        unique_rows.append(latest)
    unique_rows.sort(key=lambda row: row.get("started_at") or "", reverse=True)
    unique_rows.sort(key=lambda row: bool(row.get("priority_flag", False)), reverse=True)

    total_count = len(unique_rows)
    start = (page - 1) * page_size
    page_rows = unique_rows[start:start + page_size]
    patients = []

    for row in page_rows:
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

    total_pages = (total_count + page_size - 1) // page_size
    return {
        "patients": patients,
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/sessions/{session_id}")
def get_session_detail(session_id: str):
    session = supabase.table("intake_sessions").select("*, patients(*)").eq("id", session_id).execute()
    if not session.data:
        raise HTTPException(status_code=404)

    session_row = session.data[0]
    patient = _extract_patient(session_row)
    patient_id = patient.get("id") or session_row.get("patient_id")
    history_query = (
        supabase.table("intake_sessions")
        .select("*, patients(*)")
        .eq("patient_id", patient_id)
        .order("started_at", desc=True)
        .execute()
    )
    history_rows = history_query.data or [session_row]
    history_session_ids = [row.get("id") for row in history_rows if row.get("id")]
    history_summaries = (
        supabase.table("summaries")
        .select("*")
        .in_("session_id", history_session_ids)
        .execute()
        if history_session_ids
        else None
    )
    summaries_by_session = {
        row.get("session_id"): row
        for row in (history_summaries.data if history_summaries else [])
    }
    history_documents = (
        supabase.table("documents")
        .select("*")
        .in_("session_id", history_session_ids)
        .order("created_at", desc=True)
        .execute()
        if history_session_ids
        else None
    )
    token_by_session = {row.get("id"): row.get("token") for row in history_rows}
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
        storage_path = doc.get("storage_path")
        documents.append({
            "id": doc.get("id"),
            "session_id": doc.get("session_id"),
            "token": session_row.get("token"),
            "filename": doc.get("filename"),
            "file_type": doc.get("file_type"),
            "storage_path": storage_path,
            "size": doc.get("size"),
            "uploaded_at": doc.get("uploaded_at") or doc.get("created_at"),
            "url": _signed_url(storage_path),
        })

    previous_summaries = []
    all_documents = list(documents)
    for history_row in history_rows:
        history_session_id = history_row.get("id")
        if history_session_id == session_id:
            continue
        history_summary = summaries_by_session.get(history_session_id)
        if history_summary:
            previous_summaries.append({
                "session_id": history_session_id,
                "token": history_row.get("token"),
                "started_at": history_row.get("started_at"),
                "summary": history_summary.get("structured") or history_summary,
                "status": history_summary.get("status"),
            })
    for doc in (history_documents.data if history_documents else []):
        history_session_id = doc.get("session_id")
        if history_session_id == session_id:
            continue
        all_documents.append({
            "id": doc.get("id"),
            "session_id": history_session_id,
            "token": token_by_session.get(history_session_id),
            "filename": doc.get("filename"),
            "file_type": doc.get("file_type"),
            "storage_path": doc.get("storage_path"),
            "size": doc.get("size"),
            "uploaded_at": doc.get("uploaded_at") or doc.get("created_at"),
            "url": _signed_url(doc.get("storage_path")),
        })

    return {
        "session_id": session_row.get("id"),
        "token": session_row.get("token"),
        "state": session_row.get("state"),
        "priority_flag": bool(session_row.get("priority_flag", False)),
        "priority_reason": session_row.get("priority_reason"),
        "patient": patient,
        "transcript": transcript_data,
        "summary": summary_data,
        "documents": all_documents,
        "previous_summaries": previous_summaries,
        "patient_id": patient_id,
    }


@router.patch("/sessions/{session_id}/summary")
def update_summary(session_id: str, req: UpdateSummaryRequest):
    summary_result = supabase.table("summaries").select("structured").eq("session_id", session_id).execute()
    if not summary_result.data:
        raise HTTPException(status_code=404, detail="Summary not found for this session.")

    summary_row = summary_result.data[0]
    current_structured = summary_row.get("structured") or {}
    updated_structured = req.structured
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
