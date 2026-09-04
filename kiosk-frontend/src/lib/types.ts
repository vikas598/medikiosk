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