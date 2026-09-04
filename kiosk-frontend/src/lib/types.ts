export interface PatientInfo {
  id: string;
  name: string;
  age: number | null;
  gender: "M" | "F" | "O" | null;
  phone: string | null;
}

export interface SessionResponse {
  id: string;
  token: string;
  state: string;
  language: string;
  priority_flag: boolean;
  priority_reason: string | null;
  started_at: string;
  expires_at: string;
  patients: PatientInfo;  // Supabase returns table name (plural)
}

export interface TurnResponse {
  question: string | null;
  touch_options: string[];
  is_complete: boolean;
}

export interface StructuredSummary {
  chief_complaint: string;
  hpi: string;
  pmh: string;
  psh?: string;
  drug_history: string;
  allergy_history: string;
  family_history: string;
  personal_history: string;
  ros: string;
  red_flags_noted?: string[];
  clinical_impression?: string;
}

export interface FinalizeResponse {
  status: string;
  summary: StructuredSummary;
}

export interface DoctorQueueItem {
  session_id: string;
  token: string;
  state: string;
  priority_flag: boolean;
  priority_reason: string | null;
  started_at: string;
  completed_at?: string | null;
  patient: PatientInfo;
  summary_status?: string | null;
}

export interface DoctorQueueResponse {
  patients: DoctorQueueItem[];
  total_count: number;
}

export interface TranscriptTurn {
  q: string;
  a?: string | null;
  timestamp: string;
  input_mode?: string | null;
}

export interface DoctorDocument {
  id: string;
  session_id: string;
  filename: string | null;
  file_type: string | null;
  storage_path: string | null;
  size: number | null;
  uploaded_at: string | null;
  url?: string | null;
}

export interface DoctorSessionDetailResponse {
  session_id: string;
  token: string;
  state: string;
  priority_flag: boolean;
  priority_reason: string | null;
  patient: PatientInfo;
  transcript: {
    turns: TranscriptTurn[];
  } | null;
  summary: Record<string, unknown> | null;
  documents: DoctorDocument[];
}

export interface DoctorApprovalResponse {
  status: string;
  session_state: string;
}