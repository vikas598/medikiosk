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

export interface SummaryPoint {
  en: string;
  hi: string;
}

export interface StructuredSummary {
  points: SummaryPoint[];
  red_flags: string[];
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
  summary: StructuredSummary | null;
  documents: DoctorDocument[];
}

export interface DoctorApprovalResponse {
  status: string;
  session_state: string;
}