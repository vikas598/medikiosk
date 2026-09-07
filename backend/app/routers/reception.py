from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import uuid

from app.db import supabase
from app.schema import (
    RegisterPatientRequest,
    RegisterPatientResponse,
    ReceptionQueueResponse,
    AckRedFlagResponse,
    ChangeDepartmentRequest,
    RegenerateTokenResponse,
    ReceptionStatsResponse,
    SessionState
)

router = APIRouter(prefix="/reception", tags=["reception"])

def _get_next_token():
    result = supabase.table("intake_sessions").select("token").order("token", desc=True).limit(1).execute()
    if result.data and result.data[0].get("token"):
        try:
            next_num = int(result.data[0]["token"]) + 1
        except ValueError:
            next_num = 1
    else:
        next_num = 1
    return str(next_num).zfill(3)

def _extract_patient(row):
    patient = row.get("patients") or {}
    if isinstance(patient, list):
        patient = patient[0] if patient else {}
    return {
        "id": patient.get("id"),
        "name": patient.get("name") or "Unknown Patient",
        "age": patient.get("age"),
        "gender": patient.get("gender"),
        "phone": patient.get("phone"),
    }

@router.post("/patients", response_model=RegisterPatientResponse)
def register_patient(req: RegisterPatientRequest):
    patient_id = str(uuid.uuid4())
    patient_data = {
        "id": patient_id,
        "name": req.name,
        "age": req.age,
        "gender": req.gender,
        "phone": req.phone
    }
    p_res = supabase.table("patients").insert(patient_data).execute()
    if not p_res.data:
        raise HTTPException(status_code=500, detail="Failed to create patient")

    token = _get_next_token()
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=30)
    
    session_data = {
        "id": session_id,
        "patient_id": patient_id,
        "token": token,
        "state": SessionState.STARTED,
        "department": req.department,
        "language": req.language,
        "started_at": now.isoformat(),
        "expires_at": expires.isoformat(),
        "priority_flag": False
    }
    s_res = supabase.table("intake_sessions").insert(session_data).execute()
    if not s_res.data:
        raise HTTPException(status_code=500, detail="Failed to create session")
        
    s_data = s_res.data[0]
    
    return {
        "patient": patient_data,
        "session": {
            **s_data,
            "patient": patient_data
        }
    }

@router.get("/queue", response_model=ReceptionQueueResponse)
def get_reception_queue():
    result = supabase.table("intake_sessions")\
        .select("*, patients(*)")\
        .not_.in_("state", ["approved", "rejected", "expired"])\
        .order("started_at", desc=True)\
        .execute()
        
    rows = result.data or []
    active_sessions = []
    completed_today = 0
    red_flags_pending = 0
    
    seen_patients = set()
    deduped_rows = []
    
    # Rows are ordered by started_at desc, so the first occurrence is the latest session.
    for row in rows:
        patient = _extract_patient(row)
        unique_key = patient.get("phone") or patient.get("name") or row.get("patient_id")
        if unique_key and unique_key in seen_patients:
            continue
        if unique_key:
            seen_patients.add(unique_key)
        deduped_rows.append(row)

    total_active = len(deduped_rows)
    
    for row in deduped_rows:
        patient = _extract_patient(row)
        if row.get("priority_flag") and not row.get("red_flag_acknowledged"):
            red_flags_pending += 1
            
        active_sessions.append({
            "id": row["id"],
            "token": row["token"],
            "state": row["state"],
            "priority_flag": bool(row.get("priority_flag")),
            "priority_reason": row.get("priority_reason"),
            "red_flag_acknowledged": bool(row.get("red_flag_acknowledged")),
            "department": row.get("department") or "General Medicine",
            "language": row.get("language") or "en",
            "started_at": row.get("started_at") or "",
            "patient": patient
        })
        
    active_sessions.sort(key=lambda s: not (s["priority_flag"] and not s["red_flag_acknowledged"]))
    
    today = datetime.now(timezone.utc).date()
    comp_res = supabase.table("intake_sessions")\
        .select("id", count="exact")\
        .in_("state", ["approved", "rejected"])\
        .gte("started_at", today.isoformat())\
        .execute()
        
    completed_today = comp_res.count if comp_res.count is not None else len(comp_res.data or [])

    return {
        "active_sessions": active_sessions,
        "completed_today": completed_today,
        "red_flags_pending": red_flags_pending,
        "total_active": total_active
    }

@router.post("/sessions/{id}/acknowledge-red-flag", response_model=AckRedFlagResponse)
def acknowledge_red_flag(id: str):
    now = datetime.now(timezone.utc).isoformat()
    res = supabase.table("intake_sessions").update({
        "red_flag_acknowledged": True,
        "red_flag_acknowledged_at": now
    }).eq("id", id).execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return {"status": "ok", "acknowledged_at": now}

@router.patch("/sessions/{id}/department")
def change_department(id: str, req: ChangeDepartmentRequest):
    res = supabase.table("intake_sessions").update({
        "department": req.department
    }).eq("id", id).execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return {"status": "ok", "department": req.department}

@router.post("/sessions/{id}/regenerate-token", response_model=RegenerateTokenResponse)
def regenerate_token(id: str):
    token = _get_next_token()
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=30)
    
    res = supabase.table("intake_sessions").update({
        "token": token,
        "expires_at": expires.isoformat()
    }).eq("id", id).execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return {"token": token, "expires_at": expires.isoformat()}

@router.get("/stats", response_model=ReceptionStatsResponse)
def get_reception_stats():
    today = datetime.now(timezone.utc).date().isoformat()
    res_active = supabase.table("intake_sessions")\
        .select("id, priority_flag, red_flag_acknowledged", count="exact")\
        .not_.in_("state", ["approved", "rejected", "expired"])\
        .gte("started_at", today)\
        .execute()
        
    res_completed = supabase.table("intake_sessions")\
        .select("id", count="exact")\
        .in_("state", ["approved", "rejected"])\
        .gte("started_at", today)\
        .execute()
        
    total_active = len(res_active.data or [])
    total_completed = len(res_completed.data or [])
    total = total_active + total_completed
    red_flags = sum(1 for row in (res_active.data or []) if row.get("priority_flag"))
    
    return {
        "total_today": total,
        "in_progress": total_active,
        "completed": total_completed,
        "red_flags_today": red_flags,
        "avg_completion_minutes": None
    }
