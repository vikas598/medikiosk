-- Add department column to sessions
ALTER TABLE intake_sessions
  ADD COLUMN department TEXT DEFAULT 'General Medicine'
  CHECK (department IN ('General Medicine', 'Cardiology', 'Ayurveda'));

-- Add reception acknowledgment tracking for red flags
ALTER TABLE intake_sessions
  ADD COLUMN red_flag_acknowledged BOOLEAN DEFAULT FALSE,
  ADD COLUMN red_flag_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN red_flag_acknowledged_by UUID;

-- Add receptionist metadata table (extends Supabase Auth like doctors table)
CREATE TABLE receptionists (
  id UUID PRIMARY KEY,   -- same as auth.users.id
  name TEXT,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for reception queue (all active sessions today)
CREATE INDEX idx_sessions_reception_view
  ON intake_sessions(started_at DESC)
  WHERE state NOT IN ('approved', 'rejected', 'expired');

-- Seed one demo receptionist (create user in Supabase Auth first)
-- Then: INSERT INTO receptionists (id, name, email)
--       VALUES ('<auth-user-id>', 'Priya Reception', 'reception@medikiosk.demo');
