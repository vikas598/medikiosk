"""
MediKiosk API Schemas — Single Source of Truth

This file defines the EXACT shape of every API request and response.
All team members build against these shapes:
  - Person A: endpoints return these response models
  - Person B: LLM output is parsed into these structures
  - Person C: kiosk frontend expects these response shapes
  - Person D: doctor frontend expects these response shapes

DO NOT change a schema without telling the whole team in standup.
If you need a new field, ADD it (backward compatible). Never rename or remove.

Usage:
  from app.schemas import SessionResponse, TurnRequest, TurnResponse, ...
"""

from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from typing import Optional


# ============================================================
# ENUMS (shared vocabulary across the system)
# ============================================================

class SessionState(str, Enum):
    """State machine for intake sessions. Transitions are enforced by backend."""
    STARTED = "started"              # token created, patient hasn't done anything
    CONSENTED = "consented"          # patient agreed to consent
    INTERVIEWING = "interviewing"    # AI conversation in progress
    SUMMARY_READY = "summary_ready"  # AI generated summary, waiting for doctor
    APPROVED = "approved"            # doctor approved the summary
    REJECTED = "rejected"            # doctor rejected the summary
    EXPIRED = "expired"              # session timed out or consent declined


class SummaryStatus(str, Enum):
    """Status of the AI-generated summary."""
    DRAFT = "draft"        # AI generated, doctor hasn't reviewed
    APPROVED = "approved"  # doctor accepted (with or without edits)
    REJECTED = "rejected"  # doctor said it's unusable


class Gender(str, Enum):
    MALE = "M"
    FEMALE = "F"
    OTHER = "O"


class RedFlagTier(str, Enum):
    """Severity tier for red-flag detection."""
    CRITICAL = "critical"    # pinned to top of queue, banner
    ELEVATED = "elevated"    # floated up, yellow indicator
    STANDARD = "standard"    # no flag


# ============================================================
# SHARED SUB-MODELS (used inside multiple responses)
# ============================================================

class PatientInfo(BaseModel):
    """Patient identity. Returned nested inside session responses.
    Contains NO clinical data — identity only."""
    id: str
    name: str
    age: Optional[int] = None
    gender: Optional[Gender] = None
    phone: Optional[str] = None


class TranscriptTurn(BaseModel):
    """One turn in the interview conversation.
    'q' is the AI's question, 'a' is the patient's response.
    'a' is null for the current pending question (asked but not yet answered)."""
    q: str                                        # question the AI asked
    a: Optional[str] = None                       # patient's response (null if pending)
    timestamp: str                                # ISO 8601 string
    input_mode: Optional[str] = "text"            # "text" or "voice"


class RedFlag(BaseModel):
    """A detected red-flag condition from the interview."""
    id: str                   # rule identifier, e.g. "cardiac_acute"
    tier: RedFlagTier         # critical, elevated, or standard
    reason: str               # human-readable explanation


class StructuredSummary(BaseModel):
    """The AI-generated clinical summary. This is the core output of MediKiosk.
    Every field is a string (free text in medical language).
    'Not assessed' if information wasn't gathered during interview."""
    chief_complaint: str
    hpi: str                                      # history of present illness
    pmh: str = "Not assessed"                     # past medical history
    psh: str = "Not assessed"                     # past surgical history
    drug_history: str = "Not assessed"
    allergy_history: str = "NKDA"                 # default: no known drug allergies
    family_history: str = "Not assessed"
    personal_history: str = "Not assessed"        # smoking, alcohol, occupation
    ros: str = "Not assessed"                     # review of systems
    red_flags_noted: list[str] = []               # list of flagged concerns
    clinical_impression: str = "Not assessed"     # NOT a diagnosis


class DoctorEdits(BaseModel):
    """Diff of what the doctor changed vs the AI draft.
    Keys are section names, values have before/after."""
    # Dynamic keys, so we use a dict
    # Example: {"hpi": {"before": "...", "after": "..."}}
    pass


# ============================================================
# KIOSK ENDPOINTS — Requests & Responses
# ============================================================

# --- GET /kiosk/sessions/{token} ---

class SessionResponse(BaseModel):
    """Returned when patient enters their token at the kiosk.
    This is the first data the kiosk receives."""
    id: str                                       # session UUID — used in all subsequent calls
    token: str                                    # the 3-4 digit token (e.g., "001")
    state: SessionState                           # current session state
    language: str = "en"                          # selected language code
    priority_flag: bool = False                   # red-flag detected?
    priority_reason: Optional[str] = None         # why it was flagged
    started_at: str                               # ISO timestamp
    expires_at: str                               # ISO timestamp — token validity
    patient: PatientInfo                          # nested patient identity


# --- POST /kiosk/sessions/{id}/consent ---

class ConsentRequest(BaseModel):
    """Patient's consent decision."""
    granted: bool                                 # true = agreed, false = declined


class ConsentResponse(BaseModel):
    """Response after recording consent."""
    status: str = "ok"                            # "ok" on success
    session_state: SessionState                   # new state after consent


# --- POST /kiosk/sessions/{id}/interview/turn ---

class TurnRequest(BaseModel):
    """Patient's response to the current question (text mode)."""
    response: str = Field(..., min_length=1)      # what the patient said/typed


class TurnResponse(BaseModel):
    """The AI's next question after processing the patient's response.
    If is_complete=true, question is null and frontend should proceed to finalize."""
    question: Optional[str] = None                # next question (null if complete)
    touch_options: list[str] = []                 # multiple-choice options (empty = free text only)
    is_complete: bool = False                     # true = interview finished
    turn_number: int = 0                          # current turn count (for progress display)
    total_estimated_turns: int = 15               # rough estimate for progress bar


# --- POST /kiosk/sessions/{id}/interview/turn-audio ---
# Request: multipart form-data with audio file
# Response: same TurnResponse as text turn (backend transcribes first)


# --- POST /kiosk/sessions/{id}/finalize ---

class FinalizeResponse(BaseModel):
    """Response after summary generation is triggered."""
    status: str = "ok"
    summary: StructuredSummary                    # the generated clinical summary
    session_state: SessionState = SessionState.SUMMARY_READY


# ============================================================
# DOCTOR ENDPOINTS — Requests & Responses
# ============================================================

# --- POST /auth/doctor/login ---
# Handled by Supabase Auth — no custom schema needed
# Frontend uses supabase.auth.signInWithPassword()
# Returns Supabase session with JWT


# --- GET /doctor/queue ---

class QueuePatient(BaseModel):
    """One patient entry in the doctor's queue.
    Contains enough info to show the queue list but NOT the full summary.
    Doctor clicks to see full detail."""
    session_id: str                               # intake session UUID
    token: str                                    # display token number
    state: SessionState
    priority_flag: bool = False
    priority_reason: Optional[str] = None
    started_at: str                               # when patient started intake
    completed_at: Optional[str] = None            # when summary was generated
    patient: PatientInfo                          # name, age, gender
    summary_status: Optional[SummaryStatus] = None  # draft/approved/rejected


class QueueResponse(BaseModel):
    """The doctor's department queue. Red-flagged patients first, then by time."""
    patients: list[QueuePatient] = []
    total_count: int = 0


# --- GET /doctor/sessions/{id} ---

class TranscriptResponse(BaseModel):
    """Full interview transcript for doctor verification."""
    turns: list[TranscriptTurn] = []


class SummaryResponse(BaseModel):
    """The summary with its metadata."""
    id: str
    structured: StructuredSummary                 # the clinical content
    status: SummaryStatus = SummaryStatus.DRAFT
    doctor_edits: Optional[dict] = None           # diff if doctor edited
    created_at: str                               # when AI generated it
    approved_at: Optional[str] = None             # when doctor approved


class SessionDetailResponse(BaseModel):
    """Full detail view for one patient — everything the doctor needs.
    This is the response when doctor clicks a patient in the queue."""
    session_id: str
    token: str
    state: SessionState
    priority_flag: bool = False
    priority_reason: Optional[str] = None
    patient: PatientInfo
    transcript: TranscriptResponse                # full Q&A conversation
    summary: Optional[SummaryResponse] = None     # null if not yet generated
    red_flags: list[RedFlag] = []                 # all detected red flags


# --- PATCH /doctor/sessions/{id}/summary ---

class UpdateSummaryRequest(BaseModel):
    """Doctor's edits to the summary. Send the full updated structured summary."""
    structured: StructuredSummary                 # complete updated summary


class UpdateSummaryResponse(BaseModel):
    """Response after saving doctor's edits."""
    status: str = "ok"
    doctor_edits: dict = {}                       # computed diff: {section: {before, after}}


# --- POST /doctor/sessions/{id}/approve ---

class ApproveRequest(BaseModel):
    """Doctor approves the summary. Edits are optional (may have been saved via PATCH already)."""
    edits: Optional[dict] = None                  # optional final edits at approval time


class ApproveResponse(BaseModel):
    """Response after approval."""
    status: str = "ok"
    session_state: SessionState = SessionState.APPROVED
    approved_at: str                              # ISO timestamp


# --- POST /doctor/sessions/{id}/reject ---

class RejectRequest(BaseModel):
    """Doctor rejects the summary. Reason is required."""
    reason: str = Field(..., min_length=1)        # why the summary is unusable


class RejectResponse(BaseModel):
    """Response after rejection."""
    status: str = "ok"
    session_state: SessionState = SessionState.REJECTED


# ============================================================
# INTERNAL SCHEMAS (used by backend services, not exposed to frontend)
# ============================================================

class LLMInterviewOutput(BaseModel):
    """Expected JSON output from the interview LLM prompt.
    Person B: your prompt MUST produce output matching this shape.
    The interview service parses LLM response into this model."""
    question: Optional[str] = None                # next question (null if complete)
    touch_options: list[str] = []                 # suggested multiple-choice answers
    coverage_covered: list[str] = []              # what areas have been addressed
    coverage_remaining: list[str] = []            # what areas still need questions
    red_flags: list[RedFlag] = []                 # any red flags detected this turn
    is_complete: bool = False                     # true = sufficient history gathered
    reasoning: str = ""                           # brief explanation (for debugging, not shown to patient)


class LLMSummaryOutput(BaseModel):
    """Expected JSON output from the summary generation LLM prompt.
    Person B: your prompt MUST produce output matching this shape.
    The summary service parses LLM response into this model.
    This is identical to StructuredSummary — keeping it explicit for clarity."""
    chief_complaint: str
    hpi: str
    pmh: str = "Not assessed"
    psh: str = "Not assessed"
    drug_history: str = "Not assessed"
    allergy_history: str = "NKDA"
    family_history: str = "Not assessed"
    personal_history: str = "Not assessed"
    ros: str = "Not assessed"
    red_flags_noted: list[str] = []
    clinical_impression: str = "Not assessed"


class LLMRedFlagOutput(BaseModel):
    """Expected JSON output from the red-flag detection LLM prompt.
    Person B: your prompt MUST produce output matching this shape."""
    flags: list[RedFlag] = []


# ============================================================
# HEALTH CHECK
# ============================================================

class HealthResponse(BaseModel):
    """GET /health response."""
    status: str = "ok"
    version: str = "0.1.0"


# ============================================================
# ERROR RESPONSES
# ============================================================

class ErrorResponse(BaseModel):
    """Standard error response shape. All endpoints return this on failure.
    Frontend should check for this shape on non-2xx responses."""
    detail: str                                   # human-readable error message
    error_code: Optional[str] = None              # machine-readable code (optional)


# ============================================================
# ENDPOINT → SCHEMA MAPPING (quick reference)
# ============================================================
#
# GET    /health                              → HealthResponse
# GET    /kiosk/sessions/{token}              → SessionResponse (or ErrorResponse 404/410)
# POST   /kiosk/sessions/{id}/consent         → ConsentRequest → ConsentResponse
# POST   /kiosk/sessions/{id}/interview/turn  → TurnRequest → TurnResponse
# POST   /kiosk/sessions/{id}/interview/turn-audio → FormData(audio) → TurnResponse
# POST   /kiosk/sessions/{id}/finalize        → (no body) → FinalizeResponse
# GET    /doctor/queue                        → QueueResponse
# GET    /doctor/sessions/{id}                → SessionDetailResponse (or ErrorResponse 404)
# PATCH  /doctor/sessions/{id}/summary        → UpdateSummaryRequest → UpdateSummaryResponse
# POST   /doctor/sessions/{id}/approve        → ApproveRequest → ApproveResponse
# POST   /doctor/sessions/{id}/reject         → RejectRequest → RejectResponse
#
# ALL errors across ALL endpoints             → ErrorResponse
#
# INTERNAL (backend-only, not exposed):
#   LLM interview output                     → LLMInterviewOutput
#   LLM summary output                       → LLMSummaryOutput
#   LLM red-flag output                      → LLMRedFlagOutput
# ============================================================


# ============================================================
# DOCUMENT HANDOFF & MOBILE UPLOAD SCHEMAS
# ============================================================

class CreateHandoffResponse(BaseModel):
    handoff_token: str
    expires_at: str

class VerifyHandoffRequest(BaseModel):
    handoff_token: str
    patient_token: str

class VerifyHandoffResponse(BaseModel):
    status: str = "verified"
    upload_claim_token: str

class HandoffStatusResponse(BaseModel):
    status: str  # "pending", "claimed", "expired"