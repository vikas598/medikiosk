# 🏥 MediKiosk — Frequent Commands & Setup



# ⚡ 1. Quick Command Reference

### Frontend

```bash
npm run dev -- --host
```

### Backend

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Demo Doctor

```text
Email:    doctor@medikiosk.demo
Password: demo1234
```
# 🗄️ 1. SQL Commands

## 👤 Adding a New Patient

These commands can be used to create a new patient and add them to the **doctor queue**.
### Step 1 - Add the Patient

Insert a new patient into the `patients` table:

```sql
INSERT INTO patients (name, age, gender, phone)
VALUES ('Vikas', 19, 'M', 'YOUR_PHONE_NUMBER');
```




---

## Step 2 - Adding the Patient to the Doctor Queue

After creating the patient, add them to the `intake_sessions` table:

```sql
INSERT INTO intake_sessions (patient_id, token, state)
SELECT id, '006', 'started'
FROM patients
WHERE name = 'Vikas'
ORDER BY created_at DESC
LIMIT 1;
```

# 👨‍⚕️ 2. Doctor Demo Credentials

Use the following credentials to log into the MediKiosk doctor dashboard:

| Field        | Value                   |
| ------------ | ----------------------- |
| **Email**    | `doctor@medikiosk.demo` |
| **Password** | `demo1234`              |



> **MediKiosk** — AI-powered clinical intake and patient management system.\

## TO SWITCH LLM

# in .env
# To gemini
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash

# To groq
LLM_PROVIDER=groq
LLM_MODEL=openai/gpt-oss-120b