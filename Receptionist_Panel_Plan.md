# Receptionist Panel — Implementation Plan

> **Context:** Kiosk and doctor apps are done. Backend endpoints are live. Schema now includes a `documents` table. This plan adds the third role — reception — to complete the three-role architecture from the PS.
>
> **Estimated time:** 1.5 to 2 days for one person, or 1 day if two people pair on it.
> **Owner suggestion:** Person A (backend endpoints) + Person D (frontend) working in parallel, since the doctor panel is stable.

---

## What the receptionist actually does

Before writing any code, be clear on the role. Reception is the front desk of the hospital. In our system they do four things:

1. **Register a new patient** — capture name, age, gender, phone. Optionally ABHA/Aadhaar.
2. **Generate a token** — create an `intake_sessions` row, print/display a token slip (3-4 digit number).
3. **Assign a department** — send the patient to General Medicine / Cardiology / Ayurveda based on their complaint.
4. **Monitor and act on red-flag alerts** — when the kiosk's AI detects an emergency mid-interview, reception gets alerted and physically escorts the patient to urgent care.

**What reception does NOT do:**
- Never sees clinical summaries (DPDP purpose limitation)
- Never sees interview transcripts
- Never sees documents patients uploaded
- Never approves anything clinical

This access boundary is a feature, not a limitation. Say it clearly in your pitch.

---

## Scope decisions before you start

Two things worth locking in now:

**Department assignment for MVP:**
Since your kiosk currently supports General Medicine only, reception assigning a department is a UI-only feature — it goes into the `intake_sessions.department` column (which you'll add) but doesn't actually change interview behavior yet. For the demo, show three department options and let the receptionist pick, even though all three route to the same interview flow. Judges see the architecture; the differentiation happens post-MVP.

**Identity capture depth:**
Full product has three paths (ABHA / Aadhaar / walk-in). For this build, do **walk-in only**. ABHA and Aadhaar require external API integration that will eat 2+ days. Interface stub the buttons ("ABHA — coming soon") to show architectural readiness.

---

## Schema changes needed

You already have `patients` and `intake_sessions`. Add these:

```sql
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
```

**On the demo receptionist account:**
- Email: `reception@medikiosk.demo`
- Password: `demo1234`
- Create in Supabase Auth → then insert into `receptionists` table matching the auth ID

---

## Backend endpoints

Add these six endpoints to a new router file `backend/app/routers/reception.py`.

### Endpoint 1: `POST /reception/patients`
Register a new patient. Returns the patient + a fresh session with generated token.

**Request:**
```json
{
  "name": "Ramesh Kumar",
  "age": 58,
  "gender": "M",
  "phone": "+919876543210",
  "department": "General Medicine",
  "language": "en"
}
```

**Response:**
```json
{
  "patient": { "id": "uuid", "name": "Ramesh Kumar", "age": 58, "gender": "M", "phone": "..." },
  "session": {
    "id": "session-uuid",
    "token": "007",
    "state": "started",
    "department": "General Medicine",
    "language": "en",
    "expires_at": "2026-09-07T14:30:00Z"
  }
}
```

**Logic:**
1. Insert new row into `patients`
2. Generate next token number (find max existing token, increment, pad with zeros)
3. Insert new row into `intake_sessions` with generated token, department, 30-min expiry
4. Return combined response

**Token generation** — simple approach:
```python
# Get highest existing token, add 1
result = supabase.table("intake_sessions") \
    .select("token") \
    .order("token", desc=True) \
    .limit(1) \
    .execute()

if result.data:
    next_num = int(result.data[0]["token"]) + 1
else:
    next_num = 1

new_token = str(next_num).zfill(3)  # "007", "008", etc.
```

### Endpoint 2: `GET /reception/queue`
Full reception dashboard — all sessions from today, grouped by state.

**Response:**
```json
{
  "active_sessions": [
    {
      "id": "uuid",
      "token": "001",
      "state": "interviewing",
      "priority_flag": true,
      "priority_reason": "Cardiac acute",
      "red_flag_acknowledged": false,
      "department": "General Medicine",
      "started_at": "...",
      "patient": { "name": "Ramesh Kumar", "age": 58, "gender": "M" }
    }
  ],
  "completed_today": 12,
  "red_flags_pending": 1,
  "total_active": 5
}
```

**Logic:**
- Fetch sessions where state NOT IN ('approved', 'rejected', 'expired')
- Order: red-flagged unacknowledged first, then by started_at
- Include summary counts

### Endpoint 3: `POST /reception/sessions/{id}/acknowledge-red-flag`
Reception has physically escorted the red-flagged patient. Mark acknowledged.

**Request:** (no body needed, receptionist id from JWT)

**Response:**
```json
{ "status": "ok", "acknowledged_at": "..." }
```

**Logic:**
1. Update session: set `red_flag_acknowledged = true`, timestamps, reception ID
2. Return confirmation

### Endpoint 4: `PATCH /reception/sessions/{id}/department`
Change department assignment (in case of re-triage).

**Request:**
```json
{ "department": "Cardiology" }
```

**Response:**
```json
{ "status": "ok", "department": "Cardiology" }
```

### Endpoint 5: `POST /reception/sessions/{id}/regenerate-token`
Reception can regenerate token if the printed slip was lost.

**Response:**
```json
{ "token": "042", "expires_at": "..." }
```

**Logic:** Generate a new token number, update session, extend expiry by 30 min.

### Endpoint 6: `GET /reception/stats`
Dashboard summary card data.

**Response:**
```json
{
  "total_today": 47,
  "in_progress": 5,
  "completed": 38,
  "red_flags_today": 3,
  "avg_completion_minutes": 11
}
```

---

## Pydantic schemas to add

Add these to `backend/app/schemas.py`:

```python
# ============================================================
# RECEPTION ENDPOINTS
# ============================================================

class Department(str, Enum):
    GENERAL_MEDICINE = "General Medicine"
    CARDIOLOGY = "Cardiology"
    AYURVEDA = "Ayurveda"


class RegisterPatientRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    age: Optional[int] = Field(None, ge=0, le=120)
    gender: Optional[Gender] = None
    phone: Optional[str] = None
    department: Department = Department.GENERAL_MEDICINE
    language: str = "en"


class RegisterPatientResponse(BaseModel):
    patient: PatientInfo
    session: SessionResponse   # reuse existing schema


class ReceptionQueueItem(BaseModel):
    id: str
    token: str
    state: SessionState
    priority_flag: bool
    priority_reason: Optional[str] = None
    red_flag_acknowledged: bool = False
    department: str
    language: str
    started_at: str
    patient: PatientInfo


class ReceptionQueueResponse(BaseModel):
    active_sessions: list[ReceptionQueueItem]
    completed_today: int
    red_flags_pending: int
    total_active: int


class AckRedFlagResponse(BaseModel):
    status: str = "ok"
    acknowledged_at: str


class ChangeDepartmentRequest(BaseModel):
    department: Department


class RegenerateTokenResponse(BaseModel):
    token: str
    expires_at: str


class ReceptionStatsResponse(BaseModel):
    total_today: int
    in_progress: int
    completed: int
    red_flags_today: int
    avg_completion_minutes: Optional[float] = None
```

---

## Frontend structure

Add to your existing merged frontend (from the role-select landing page). New folder:

```
src/pages/reception/
├── Login.tsx          — same pattern as doctor login
├── Dashboard.tsx      — main queue view (default landing after login)
├── Register.tsx       — new patient registration form
└── TokenSlip.tsx      — printable token slip (modal or route)
```

Update `App.tsx` to add reception routes:

```typescript
import ReceptionLogin from './pages/reception/Login';
import ReceptionDashboard from './pages/reception/Dashboard';
import ReceptionRegister from './pages/reception/Register';

// In the router:
<Route path="/reception/login" element={<ReceptionLogin />} />
<Route path="/reception/dashboard" element={<ReceptionDashboard />} />
<Route path="/reception/register" element={<ReceptionRegister />} />
```

Update the role selector landing page — add a third card:

```tsx
{/* Reception card */}
<button
  onClick={() => navigate('/reception/login')}
  className="bg-white rounded-3xl shadow-lg p-12 w-72 text-center
             hover:shadow-xl hover:scale-105 transition-all border-2 border-transparent
             hover:border-amber-400"
>
  <div className="text-7xl mb-6">🏥</div>
  <h2 className="text-3xl font-bold text-amber-800 mb-3">Reception</h2>
  <p className="text-lg text-gray-500">
    Register patients & manage queue
  </p>
</button>
```

Change the layout to 3 cards horizontally instead of 2.

---

## Page 1: Reception Login

Same pattern as doctor login. Copy `pages/doctor/Login.tsx` to `pages/reception/Login.tsx` and change:
- Title: "MediKiosk — Reception Portal"
- Colors: amber/orange accent instead of blue
- Redirect: `navigate('/reception/dashboard')` on success
- Prefill hint: "reception@medikiosk.demo"

---

## Page 2: Dashboard (main view)

This is where reception spends most of their time. Layout:

```
┌────────────────────────────────────────────────────────────┐
│ MediKiosk Reception                    Priya · Logout      │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Stats Row ─────────────────────────────────────────┐   │
│  │  47 today  │  5 active  │  38 done  │  ⚠ 1 alert   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ Red Flag Alerts (if any) ──────────────────────────┐   │
│  │  ⚠ Token #007 — Ramesh Kumar                         │   │
│  │    Cardiac acute — chest pain with dyspnea           │   │
│  │    [ Escort to Emergency ]  [ Mark Acknowledged ]    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌───────────────────────────────────────┬─ Actions ───┐   │
│  │  Active Queue                          │             │   │
│  │  ────────────────                      │  [+ New     │   │
│  │  #001  Ramesh Kumar   Interviewing     │   Patient]  │   │
│  │  #002  Sunita Devi    Ready for Dr.    │             │   │
│  │  #003  Priya Patel    Consent          │             │   │
│  └────────────────────────────────────────┴─────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**Key components:**

**Stats row:** 4 colored cards showing key numbers. Simple, glanceable.

**Red flag alert banner:** Only shows if there are unacknowledged red flags. Big, red, unavoidable. Includes:
- Token number and patient name (large)
- Priority reason
- "Mark Acknowledged" button (calls the acknowledge endpoint)
- Optional: department where to send them (from a hardcoded lookup — cardiac → Cardiology)

**Active queue:** All in-progress sessions from today. Shows:
- Token
- Patient name (age/gender)
- Current state (readable: "Consenting", "Interviewing", "Ready for Doctor")
- Department badge
- Started time (relative: "3 min ago")

**Right sidebar:** Big "+ Register New Patient" button at the top. Below: quick links or actions.

**Realtime updates:** Subscribe to `intake_sessions` table changes via Supabase Realtime. When a red flag is set on any session, the alert banner appears without page refresh. When sessions complete, they disappear from active queue.

**Code sketch:**

```tsx
// src/pages/reception/Dashboard.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getReceptionQueue, acknowledgeRedFlag } from '../../lib/api';

export default function Dashboard() {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({ total_today: 0, in_progress: 0, completed: 0, red_flags_today: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchQueue = async () => {
    try {
      const { data } = await getReceptionQueue();
      setQueue(data.active_sessions);
      setStats({
        total_today: data.total_active + data.completed_today,
        in_progress: data.total_active,
        completed: data.completed_today,
        red_flags_today: data.red_flags_pending,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auth check
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate('/reception/login', { replace: true });
    });

    fetchQueue();

    // Realtime subscription
    const channel = supabase
      .channel('reception-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'intake_sessions' }, fetchQueue)
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  const handleAcknowledge = async (sessionId: string) => {
    await acknowledgeRedFlag(sessionId);
    fetchQueue();
  };

  const redFlagged = queue.filter(s => s.priority_flag && !s.red_flag_acknowledged);
  const normal = queue.filter(s => !s.priority_flag || s.red_flag_acknowledged);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">MediKiosk Reception</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/reception/register')}
            className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 font-medium">
            + Register Patient
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); navigate('/reception/login'); }}
            className="text-gray-500 hover:text-gray-700 text-sm">
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Today" value={stats.total_today} color="gray" />
          <StatCard label="In Progress" value={stats.in_progress} color="blue" />
          <StatCard label="Completed" value={stats.completed} color="green" />
          <StatCard label="Red Flags" value={stats.red_flags_today} color="red" alert={stats.red_flags_today > 0} />
        </div>

        {/* Red flag alerts */}
        {redFlagged.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-600 rounded-r-xl p-5 mb-6">
            <h2 className="text-red-800 font-bold text-lg mb-3">⚠ Priority Alerts — Immediate Action Needed</h2>
            {redFlagged.map(session => (
              <div key={session.id} className="bg-white rounded-lg p-4 mb-2 flex justify-between items-center">
                <div>
                  <p className="text-xl font-bold text-red-900">
                    Token #{session.token} — {session.patient.name}
                  </p>
                  <p className="text-red-700 mt-1">{session.priority_reason}</p>
                </div>
                <button onClick={() => handleAcknowledge(session.id)}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700">
                  Mark Acknowledged
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Active queue */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="border-b px-5 py-3">
            <h2 className="font-semibold text-gray-900">Active Queue ({normal.length})</h2>
          </div>
          {normal.length === 0 ? (
            <p className="p-8 text-center text-gray-500">No active sessions</p>
          ) : (
            <div className="divide-y">
              {normal.map(session => (
                <QueueRow key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color, alert = false }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-900',
    blue: 'bg-blue-100 text-blue-900',
    green: 'bg-green-100 text-green-900',
    red: alert ? 'bg-red-600 text-white' : 'bg-red-100 text-red-900',
  };
  return (
    <div className={`${colors[color]} rounded-xl p-5`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

function QueueRow({ session }) {
  const stateLabel = {
    started: 'Waiting to start',
    consented: 'Consenting',
    interviewing: 'Interview in progress',
    summary_ready: 'Ready for doctor',
  }[session.state] || session.state;

  return (
    <div className="flex justify-between items-center p-4 hover:bg-gray-50">
      <div className="flex items-center gap-4">
        <span className="text-xl font-mono font-bold text-gray-400 w-16">#{session.token}</span>
        <div>
          <p className="font-semibold text-gray-900">
            {session.patient.name}
            <span className="text-gray-500 font-normal ml-2">
              {session.patient.age}/{session.patient.gender}
            </span>
          </p>
          <p className="text-sm text-gray-500">{stateLabel} · {session.department}</p>
        </div>
      </div>
      <div className="text-sm text-gray-400">
        {new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}
```

---

## Page 3: Register New Patient

The form reception fills out. Keep it simple — the fields we defined in the request schema.

**Layout:**
```
┌──────────────────────────────────────────────┐
│  ← Back to Dashboard                          │
│                                                │
│  Register New Patient                          │
│                                                │
│  Full Name  [_______________________]          │
│  Age        [___]  Gender  [ M | F | O ]      │
│  Phone      [+91____________________]          │
│                                                │
│  Department                                    │
│  ● General Medicine                            │
│  ○ Cardiology                                  │
│  ○ Ayurveda                                    │
│                                                │
│  Language                                      │
│  ● English   ○ Hindi   ○ Other                 │
│                                                │
│           [ Cancel ]  [ Register & Generate ]  │
└──────────────────────────────────────────────┘
```

On successful registration, immediately show the token slip modal (Page 4).

**Code sketch:**

```tsx
// src/pages/reception/Register.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerPatient } from '../../lib/api';
import TokenSlip from './TokenSlip';

export default function Register() {
  const [form, setForm] = useState({
    name: '', age: '', gender: 'M', phone: '',
    department: 'General Medicine', language: 'en'
  });
  const [loading, setLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await registerPatient({
        ...form,
        age: form.age ? parseInt(form.age) : null,
      });
      setGeneratedToken(data);
    } catch (err) {
      setError('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (generatedToken) {
    return <TokenSlip data={generatedToken} onDone={() => navigate('/reception/dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/reception/dashboard')}
          className="text-amber-600 hover:text-amber-800 mb-4">
          ← Back to Dashboard
        </button>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Register New Patient</h1>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input type="text" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none"
                autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input type="number" value={form.age}
                  onChange={e => setForm({ ...form, age: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <div className="flex gap-2">
                  {['M', 'F', 'O'].map(g => (
                    <button key={g} type="button"
                      onClick={() => setForm({ ...form, gender: g })}
                      className={`flex-1 p-3 border-2 rounded-lg font-medium ${
                        form.gender === g ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200'
                      }`}>
                      {g === 'M' ? 'Male' : g === 'F' ? 'Female' : 'Other'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+91"
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <div className="grid grid-cols-3 gap-3">
                {['General Medicine', 'Cardiology', 'Ayurveda'].map(dept => (
                  <button key={dept} type="button"
                    onClick={() => setForm({ ...form, department: dept })}
                    className={`p-3 border-2 rounded-lg font-medium ${
                      form.department === dept ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200'
                    }`}>
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <div className="flex gap-3">
                {[{ code: 'en', label: 'English' }, { code: 'hi', label: 'Hindi' }].map(l => (
                  <button key={l.code} type="button"
                    onClick={() => setForm({ ...form, language: l.code })}
                    className={`flex-1 p-3 border-2 rounded-lg font-medium ${
                      form.language === l.code ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200'
                    }`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ABHA/Aadhaar stubs for architectural readiness */}
            <div className="border-t pt-5">
              <p className="text-sm text-gray-500 mb-2">Optional identity linkage (coming soon)</p>
              <div className="flex gap-3">
                <button type="button" disabled className="flex-1 p-3 border-2 border-gray-200 rounded-lg text-gray-400">
                  Link ABHA ID
                </button>
                <button type="button" disabled className="flex-1 p-3 border-2 border-gray-200 rounded-lg text-gray-400">
                  Verify with Aadhaar
                </button>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => navigate('/reception/dashboard')}
                className="flex-1 p-4 border-2 border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 p-4 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium">
                {loading ? 'Registering...' : 'Register & Generate Token'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## Page 4: Token Slip

After registration, show a large, printable-looking slip with the token number. The receptionist would print this and hand it to the patient.

```tsx
// src/pages/reception/TokenSlip.tsx
export default function TokenSlip({ data, onDone }) {
  const { patient, session } = data;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full">
        {/* Slip content */}
        <div className="p-8 border-b-2 border-dashed">
          <p className="text-center text-sm text-gray-500 mb-2">MediKiosk</p>
          <p className="text-center text-xs text-gray-400 mb-6">Your Token Number</p>

          <div className="text-center mb-8">
            <p className="text-8xl font-bold text-amber-600 tracking-wider">
              {session.token}
            </p>
          </div>

          <div className="space-y-2 text-center">
            <p className="text-xl font-semibold">{patient.name}</p>
            <p className="text-gray-600">{patient.age} years · {patient.gender}</p>
            <p className="text-gray-600">{session.department}</p>
          </div>

          <div className="mt-8 pt-6 border-t border-dashed">
            <p className="text-sm text-gray-600 text-center">
              Please proceed to the kiosk and enter your token number.
            </p>
            <p className="text-xs text-gray-400 text-center mt-2">
              Token valid until {new Date(session.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 flex gap-3">
          <button onClick={() => window.print()}
            className="flex-1 p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50">
            🖨 Print
          </button>
          <button onClick={onDone}
            className="flex-1 p-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## API client additions

Add to `src/lib/api.ts`:

```typescript
// Reception endpoints
export const registerPatient = (data: any) =>
  api.post('/reception/patients', data);

export const getReceptionQueue = () =>
  api.get('/reception/queue');

export const acknowledgeRedFlag = (sessionId: string) =>
  api.post(`/reception/sessions/${sessionId}/acknowledge-red-flag`);

export const changeDepartment = (sessionId: string, department: string) =>
  api.patch(`/reception/sessions/${sessionId}/department`, { department });

export const regenerateToken = (sessionId: string) =>
  api.post(`/reception/sessions/${sessionId}/regenerate-token`);

export const getReceptionStats = () =>
  api.get('/reception/stats');
```

---

## Order of work (do it in this sequence)

If one person owns the whole thing:

**Morning (4-5 hours) — Backend:**
1. Run schema migrations (add columns, receptionists table)
2. Create receptionist user in Supabase Auth + insert into table
3. Add Pydantic schemas
4. Build register endpoint + test
5. Build queue endpoint + test
6. Build acknowledge + change department + regenerate + stats endpoints
7. Deploy to Railway

**Afternoon (4-5 hours) — Frontend:**
1. Add reception routes to App.tsx + third card on role selector
2. Build Login page (copy from doctor)
3. Build Dashboard page (main work — 2 hours)
4. Build Register page
5. Build Token Slip page
6. Wire up Supabase Realtime for live queue updates
7. Test the full flow end-to-end

**End of day (1 hour) — Integration test:**
1. Reception logs in → registers "Test Patient" → gets token 007
2. Someone opens the kiosk → enters 007 → completes full flow
3. Say "chest pain and difficulty breathing" during interview
4. Reception dashboard should show ⚠ alert appear in real-time
5. Reception clicks "Mark Acknowledged" → alert goes away
6. Doctor logs in → sees patient in queue → approves
7. Reception dashboard shows completed count go up

---

## Demo integration — updated flow

Your demo now has three actors, which strengthens the pitch. The updated demo script:

**Scene 1 — Reception (30 seconds):**
"An elderly patient walks up to reception. The receptionist takes their basic details and taps a few buttons." Show the register form, submit, show the token slip. "Token 007 is printed and handed over."

**Scene 2 — Patient at kiosk (4 minutes):**
"Patient walks to the kiosk, enters 007, sees their name, agrees to consent, and starts the AI conversation." Do a full conversation, trigger a red flag.

**Scene 3 — Reception red flag response (30 seconds):**
"Meanwhile, the receptionist's screen has updated in real time." Switch to reception dashboard, show the red alert prominently. "She acknowledges the alert and escorts the patient to emergency."

**Scene 4 — Doctor review (2 minutes):**
"For patients without red flags, the doctor sees the completed intake in their queue with a full structured summary." Show doctor flow.

This three-role narrative is much more compelling than the two-role MVP demo. It matches real hospital workflow.

---

## What to skip for now

Don't overengineer. Skip these until later:
- Bulk patient import (CSV upload)
- Search/filter on queue
- Historical view (yesterday's patients)
- Analytics dashboard
- Print styling optimization
- Reception-to-reception handoff (shift changes)
- Custom department creation

The MVP receptionist panel needs to work for demo — register, view queue, respond to red flags. That's it.

---

## Common pitfalls to avoid

1. **Don't let reception see clinical data.** In your backend endpoints, explicitly exclude `transcript`, `summary`, and `documents` from responses. Test this: hit the reception queue endpoint and verify no clinical fields leak.

2. **Don't skip the acknowledge flow.** A red flag that appears on screen but has no acknowledge action feels broken. The acknowledge button both records the action (for audit) and clears the alert (for UI cleanliness).

3. **Real-time is critical.** If reception has to refresh to see red flags, the demo falls flat. Get Supabase Realtime working before polishing UI.

4. **Token collision.** If two receptionists register simultaneously, they might get the same token. Use a database-level unique constraint (you already have this on `intake_sessions.token`) and retry on conflict. For MVP with one demo receptionist, this won't happen — but note it as a known limitation.

5. **Test the whole three-role flow end-to-end multiple times.** With three actors, there are more integration points. Reserve at least 30 minutes at the end of day for full-flow testing.

---

## Time estimate summary

| Task | Hours |
|------|-------|
| Schema migrations + seed | 0.5 |
| Backend endpoints (6) | 4 |
| Frontend scaffold + routes | 0.5 |
| Login page | 0.5 |
| Dashboard page (with realtime) | 3 |
| Register page | 1.5 |
| Token slip page | 1 |
| Integration testing | 1 |
| **Total (one person)** | **~12 hours** |

Split across two people: about 6-7 hours each. Doable in one focused day.
