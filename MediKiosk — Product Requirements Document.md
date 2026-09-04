## **MediKiosk — Product Requirements Document**

**Version:** 1.0 (MVP)  
 **Last updated:** Day 0 of build  
 **Owner:** \[Team Lead Name\]  
 **Status:** Approved for build

---

### **1\. Executive Summary**

#### **1.1 What we're building**

MediKiosk is an AI-powered clinical intake platform designed for high-volume Indian hospital OPDs. It shifts the time-intensive task of clinical history taking from the overburdened doctor to a patient-facing kiosk driven by conversational AI, while digitizing prior medical documents and generating a physician-ready structured summary — all before the patient enters the consultation room.

#### **1.2 Why we're building it**

Indian government OPDs give doctors 2–5 minutes per patient. Within this window, doctors must elicit history, examine the patient, review prior records, formulate a diagnosis, counsel, and prescribe. The result is systematic under-elicitation of history, missed comorbidities, repeated questioning across visits, and diagnostic error. Existing solutions (hospital kiosks, mobile apps, nurse triage desks) solve pieces of this but none address the full first-mile problem.

#### **1.3 Success criteria for MVP**

The MVP is successful if:

1. A first-visit, non-tech-savvy patient can complete the full intake unassisted in under 12 minutes  
2. The generated summary reduces doctor's history-taking time by at least 60% in demo scenarios  
3. Red-flag conditions are detected during intake and routed to reception within 5 seconds  
4. All patient data flows respect DPDP Act 2023 obligations  
5. The generated FHIR R4 bundle validates against ABDM specifications

#### **1.4 Non-goals for MVP**

* Autonomous clinical diagnosis or treatment recommendations  
* Real integration with UIDAI Aadhaar auth  
* Real integration with ABDM sandbox  
* Real integration with any hospital HIS  
* Multi-hospital / multi-tenant deployment  
* Analytics dashboards  
* Mobile native applications

---

### **2\. Users and Roles**

#### **2.1 User personas**

**Persona 1: Ramesh Kumar, 58, chest pain patient**

* Regular visitor to government hospital  
* Owns basic feature phone, no smartphone  
* Reads Hindi, some English  
* Has faded Aadhaar card in wallet, no ABHA ID  
* Has three prior prescriptions and one lab report from previous visits  
* Anxious about being taken seriously

**Persona 2: Sunita Devi, 72, diabetic follow-up**

* First visit to this hospital  
* Cannot read; speaks Tamil only  
* Accompanied by adult son who has smartphone  
* Has stack of 15+ documents from various providers over 5 years  
* Elderly, hard of hearing

**Persona 3: Rakesh, 24, tech-comfortable young adult**

* Visiting Ayurveda OPD for chronic digestive issues  
* Has ABHA ID linked, smartphone  
* English-comfortable  
* No prior documents to upload  
* Wants to be done fast

**Persona 4: Meena, 35, receptionist**

* 3 years experience at this hospital  
* Types quickly, handles 40+ registrations per shift  
* Speaks Hindi and English  
* Trusted by patients for triage decisions  
* Currently uses paper registers

**Persona 5: Dr. Sharma, 45, cardiologist**

* Sees 60+ patients per shift  
* Frustrated by having to re-elicit history every visit  
* Owns smartphone, uses laptop at clinic  
* Skeptical of AI but open to tools that save time  
* Legally accountable for every diagnosis

#### **2.2 Role definitions**

| Role | Primary responsibility | System access |
| ----- | ----- | ----- |
| **Patient** | Provide clinical history via kiosk | Kiosk PWA only, via token |
| **Receptionist** | Register patients, assign departments, handle red-flag alerts | Reception app; logistics-only data access |
| **Doctor** | Review AI-generated summary, edit, approve, provide clinical care | Doctor web app; full clinical data access, scoped to their department |
| **System (out of MVP scope)** | Admin functions, multi-facility management | Not built in MVP |

#### **2.3 Explicit access boundaries**

**Receptionist can access:**

* Patient name, age, gender, phone, ABHA ID/Aadhaar (for entry only)  
* Token status, department assignment  
* Red-flag boolean and category (e.g., "cardiac\_acute")  
* Time in current status

**Receptionist cannot access:**

* Clinical summary content  
* Interview transcript  
* Uploaded documents  
* Doctor's edits or notes  
* Other departments' patients (view-only for reception's own facility)

**Doctor can access:**

* Full clinical summary  
* Full interview transcript  
* All uploaded documents with abnormal flags  
* Red-flag details  
* Their own department's patients only

**Doctor cannot access:**

* Other departments' patients  
* Patient data outside their approval history  
* Reception's admin functions

---

### **3\. Product Scope**

#### **3.1 In scope for MVP**

**Interfaces (3):**

* Reception app (web)  
* Kiosk PWA (patient-facing)  
* Doctor web app

**Departments (3):**

* General Medicine (allopathic)  
* Cardiology (allopathic)  
* Ayurveda OPD

**Languages (3):**

* English  
* Hindi  
* One regional language (Tamil, Marathi, Bengali, or Telugu — TBD by team)

**AI capabilities:**

* Speech-to-text (Indic languages)  
* Text-to-speech (Indic languages)  
* Conversational history taking (SOCRATES \+ Dashavidha)  
* Document OCR (printed \+ handwritten)  
* Clinical entity extraction  
* Summary generation  
* Red-flag detection

**Compliance:**

* DPDP Act 2023 alignment  
* ABDM-ready FHIR R4 bundle generation  
* Audit logging

#### **3.2 Out of scope for MVP (deferred to production or final 10 days)**

* Real ABDM sandbox integration  
* Real UIDAI Aadhaar OTP  
* Multi-facility support  
* Analytics dashboards  
* Reporting features  
* Mobile native apps (PWAs only)  
* Break-the-glass emergency access  
* Doctor-to-doctor collaboration  
* Patient portal for viewing history  
* Third-party HIS integrations (Bahmni, Medixcel, etc.)

---

### **4\. Feature Specifications**

#### **Module A — Conversational History Engine**

##### **A.1 Token-based session initiation**

**Description:** Patient starts their kiosk session by presenting a token generated by reception.

**Requirements:**

* **A.1.1** Kiosk idle screen displays two entry options: "Scan Token QR" and "Enter Token Number"  
* **A.1.2** QR scan uses device camera; falls back to manual entry if permission denied  
* **A.1.3** Token numbers are 3–4 digits (e.g., "047")  
* **A.1.4** Token lookup returns patient's registered info (name, age, gender, department)  
* **A.1.5** Invalid or expired tokens show error: "Token not recognized. Please return to reception."  
* **A.1.6** Tokens expire 30 minutes after generation  
* **A.1.7** Confirmation screen displays: patient name (large), department, "Is this you?" with \[Yes\] and \[No, go to reception\] buttons

**Acceptance criteria:**

* Given a valid unexpired token, when patient scans QR, then confirmation screen appears within 2 seconds showing correct info  
* Given an expired token, when patient enters it, then error message appears and no session is created  
* Given "No, go to reception" is tapped, then session is terminated and idle screen returns

**Priority:** P0 (blocker)

---

##### **A.2 Language selection**

**Description:** Patient chooses their preferred language for the entire kiosk interaction.

**Requirements:**

* **A.2.1** Three language options displayed as large buttons with native script labels: हिंदी, English, தமிழ் (or chosen regional)  
* **A.2.2** Language selection persists for entire session  
* **A.2.3** All subsequent UI, prompts, and audio use selected language  
* **A.2.4** Language cannot be changed mid-session (would require restart)

**Acceptance criteria:**

* Given language is set to Hindi, when consent screen loads, then all text and audio are in Hindi  
* Font size minimum 18pt; buttons minimum 60px height for touchscreen accessibility

**Priority:** P0

---

##### **A.3 Notice display and audio playback**

**Description:** Patient sees and hears a privacy notice before consent.

**Requirements:**

* **A.3.1** Notice text displayed in selected language  
* **A.3.2** Large "Play Audio" button auto-plays notice narration on screen load  
* **A.3.3** Replay button available  
* **A.3.4** Notice content includes: what data is collected, purpose, sharing, revocation rights, grievance contact  
* **A.3.5** Notice version tracked in database for auditability

**Acceptance criteria:**

* Audio playback starts within 1 second of screen load  
* Notice text is at least 18pt, high contrast  
* Screen cannot be dismissed without either audio completing or being manually stopped

**Priority:** P0

---

##### **A.4 Consent capture (granular)**

**Description:** Patient explicitly grants or declines consent, with granular scope options.

**Requirements:**

* **A.4.1** Four consent scopes presented as separate toggles:  
  1. Intake conversation (mandatory to proceed)  
  2. Document processing (optional; skipped if declined)  
  3. Doctor sharing (mandatory to proceed)  
  4. ABHA linkage (optional; only shown if patient has ABHA)  
* **A.4.2** No pre-ticked boxes (DPDP requirement)  
* **A.4.3** "I Agree" and "Decline" buttons same size, same prominence  
* **A.4.4** Decline → session terminates, all captured data purged, exit screen shown  
* **A.4.5** Grant → consent record saved with timestamp, language, notice version, scope details  
* **A.4.6** Consent record structure matches ABDM Consent Manager artifact format for future migration

**Acceptance criteria:**

* If patient declines, database has no patient record (only anonymized audit log entry)  
* Consent record captures all four scope states even if some are false

**Priority:** P0

---

##### **A.5 Consent revocation (accessible from every screen)**

**Description:** Patient can withdraw consent at any point during their session.

**Requirements:**

* **A.5.1** Red "Withdraw Consent" button visible on every kiosk screen (top-right corner)  
* **A.5.2** Tap triggers confirmation dialog: "Are you sure? All your data will be deleted."  
* **A.5.3** On confirmation: session state → `revoked`, transcripts deleted, documents purged from blob storage  
* **A.5.4** Audit log entry retained (no PII) noting revocation timestamp  
* **A.5.5** Exit screen displays confirmation and thanks patient

**Acceptance criteria:**

* Revocation button is same size and prominence on every screen (\>= 44x44 pixels)  
* Session data is fully purged within 10 seconds of confirmation

**Priority:** P0

---

##### **A.6 AI-driven conversational interview (allopathic mode)**

**Description:** LLM-driven adaptive interview using the SOCRATES framework for allopathic departments.

**Requirements:**

* **A.6.1** Interview covers: Chief Complaint, HPI (with SOCRATES sub-questions), Past Medical History, Past Surgical History, Drug History, Allergy History, Family History, Personal History, Review of Systems  
* **A.6.2** Each turn: patient input (voice or text) → LLM generates next question constrained by SOCRATES template \+ coverage checklist  
* **A.6.3** Dual input mode: every question offers voice input AND touch-based multiple-choice options  
* **A.6.4** LLM determines when history is complete based on coverage checklist; signals "history complete" to move to next stage  
* **A.6.5** Interview supports interruption and resumption within session timeout window  
* **A.6.6** Every turn saved to `transcripts` table with input mode, question, response, timestamp  
* **A.6.7** Target turn latency: under 3 seconds from patient input to next question

**Acceptance criteria:**

* Given patient says "chest pain", when next question is generated, then it addresses one of SOCRATES dimensions (site, onset, character, radiation, timing, aggravating factors, severity)  
* Interview completes in 15–25 turns for typical presentations  
* Both voice and touch inputs produce equivalent downstream data

**Priority:** P0

---

##### **A.7 AI-driven conversational interview (Ayurveda mode)**

**Description:** LLM-driven adaptive interview using Dashavidha Pariksha \+ Ahara-Vihara framework for Ayurveda department.

**Requirements:**

* **A.7.1** Interview covers 10 Pariksha parameters: Prakriti, Vikriti, Sara, Samhanana, Pramana, Satmya, Sattva, Ahara Shakti, Vyayama Shakti, Vaya  
* **A.7.2** Interview covers Ahara (diet) and Vihara (lifestyle) assessment  
* **A.7.3** Different question templates loaded when `department.interview_mode = 'ayush'`  
* **A.7.4** Same dual-input (voice \+ touch) requirement as A.6  
* **A.7.5** Ayurveda-specific terminology used in questions and touch options

**Acceptance criteria:**

* Given patient enters Ayurveda OPD via reception, when interview starts, then first question addresses Prakriti or chief complaint per Ayurveda convention  
* Summary includes Pariksha findings section not present in allopathic summaries

**Priority:** P0

---

##### **A.8 Red-flag detection (tiered)**

**Description:** AI monitors interview turns for emergency symptom patterns and triggers alerts.

**Requirements:**

* **A.8.1** Five hardcoded red-flag conditions:  
  * Cardiac acute (chest pain \+ dyspnea \+ radiation or age \>45)  
  * Stroke (FAST: face droop, arm weakness, slurred speech, sudden confusion)  
  * Acute abdomen (severe pain \+ vomiting \+ rigidity)  
  * Sudden severe headache (thunderclap or worst-ever)  
  * Altered consciousness (confusion, drowsiness, disorientation)  
* **A.8.2** Tiered output: `critical`, `elevated`, `standard`  
* **A.8.3** Multi-condition matching (not single keyword) — requires supporting evidence  
* **A.8.4** LLM-based fuzzy matching \+ keyword fallback  
* **A.8.5** Red-flag check runs after every interview turn  
* **A.8.6** On trigger:  
  * Session `priority_flag = true`, tier stored  
  * Redis pub/sub event to reception dashboard (immediate)  
  * Redis pub/sub event to doctor queue (session floats to top)  
  * Patient sees on-screen guidance message \+ audio prompt in their language  
* **A.8.7** Interview continues after red-flag trigger (does not halt)  
* **A.8.8** Guidance message: "Please inform reception staff about your symptoms immediately. Note: false emergency claims may delay treatment for other patients."

**Acceptance criteria:**

* Given patient describes chest pain with radiation to arm and dyspnea, when turn completes, then critical red flag is triggered within 5 seconds and reception dashboard shows alert  
* False positive rate acceptable; false negative rate should be minimized (cost asymmetry)

**Priority:** P0

---

#### **Module B — Document Digitization**

##### **B.1 Document upload (three paths \+ skip)**

**Description:** Patient can upload prior medical documents via three methods, or skip.

**Requirements:**

* **B.1.1** Upload screen appears after interview completion  
* **B.1.2** Three options presented as equal-prominence buttons:  
  1. "Upload from this kiosk" — file picker or camera capture  
  2. "Scan QR to upload from phone" — displays QR code  
  3. "Skip — no documents" — proceeds to summary  
* **B.1.3** Multi-file upload supported (up to 10 documents per session)  
* **B.1.4** Accepted formats: JPG, PNG, PDF (max 10MB per file)  
* **B.1.5** Upload confirmation shown for each file  
* **B.1.6** Patient can delete uploaded files before proceeding

**Acceptance criteria:**

* Given patient chooses skip, when button tapped, then summary generation begins immediately  
* Given upload fails, when error occurs, then patient sees clear message and can retry or skip

**Priority:** P0

---

##### **B.2 QR-based phone upload**

**Description:** Patient scans QR from kiosk to upload documents from their smartphone.

**Requirements:**

* **B.2.1** Kiosk generates one-time upload token, valid for 15 minutes  
* **B.2.2** QR encodes URL: `https://[domain]/upload/{token}`  
* **B.2.3** URL opens mobile-optimized web page (not native app)  
* **B.2.4** Mobile page supports camera capture and file picker  
* **B.2.5** No login required on mobile page (token-based auth)  
* **B.2.6** Kiosk polls session for uploads and updates UI when new files arrive  
* **B.2.7** Patient can complete kiosk flow while more uploads happen from phone (concurrent)

**Acceptance criteria:**

* Given valid QR scanned, when mobile page loads, then camera capture is available without additional taps  
* Kiosk shows real-time upload progress when files arrive from phone

**Priority:** P0

---

##### **B.3 OCR processing (background)**

**Description:** Uploaded documents are OCR'd asynchronously to extract text.

**Requirements:**

* **B.3.1** Upload immediately returns 202 Accepted; processing happens in background  
* **B.3.2** OCR pipeline: raw image → Google Cloud Vision OCR → structured text with confidence scores  
* **B.3.3** Supports printed and handwritten text in English, Hindi, and selected regional language  
* **B.3.4** OCR output stored in `documents.ocr_text` with per-block confidence  
* **B.3.5** Low-confidence blocks (below 0.7) flagged for physician verification  
* **B.3.6** Processing target: 90% of documents processed within 30 seconds of upload

**Acceptance criteria:**

* Given a legible printed prescription, when OCR completes, then extracted text has \>95% character accuracy  
* Given a handwritten prescription with poor legibility, when OCR completes, then confidence flags are set and doctor is warned

**Priority:** P0

---

##### **B.4 Clinical entity extraction**

**Description:** LLM extracts structured clinical entities from OCR text.

**Requirements:**

* **B.4.1** Entities extracted:  
  * Document type (prescription, lab report, discharge summary, imaging report, other)  
  * Diagnoses (with ICD-10 code where confident)  
  * Medications (name, dosage, frequency, duration)  
  * Lab values (test name, value, unit, reference range if present)  
  * Procedures / surgeries (name, date)  
  * Document date  
* **B.4.2** LLM prompt returns structured JSON  
* **B.4.3** Extracted entities stored in `documents.extracted_entities` JSONB  
* **B.4.4** If document type cannot be classified, marked as "other"  
* **B.4.5** If date cannot be extracted, placed in "undated" bucket

**Acceptance criteria:**

* Given a prescription with "Amlodipine 5mg OD", when extraction completes, then medications array contains {name: "Amlodipine", dosage: "5mg", frequency: "OD"}  
* Extraction handles handwritten dosages with \~80% accuracy on legible samples

**Priority:** P0

---

##### **B.5 Chronological ordering**

**Description:** Documents are ordered by date for physician review.

**Requirements:**

* **B.5.1** Documents with extracted dates ordered newest-first  
* **B.5.2** Documents in "undated" bucket displayed at bottom  
* **B.5.3** Doctor UI displays timeline visualization

**Acceptance criteria:**

* Given three documents dated 2023, 2024, 2025, when doctor views timeline, then 2025 appears first  
* Given one document without date, when doctor views timeline, then it appears in "Undated" section

**Priority:** P1

---

##### **B.6 Abnormal value flagging**

**Description:** Lab values outside reference ranges are highlighted.

**Requirements:**

* **B.6.1** Reference ranges hardcoded for 15–20 common tests: Hb, WBC, platelets, FBS, PPBS, HbA1c, total cholesterol, LDL, HDL, triglycerides, SGOT, SGPT, total bilirubin, urea, creatinine, TSH, sodium, potassium, urine specific gravity, urine protein  
* **B.6.2** Sex-specific ranges applied where relevant (e.g., Hb ranges differ for M/F)  
* **B.6.3** Flagged values stored in `documents.abnormal_flags` with severity (borderline, abnormal, critical)  
* **B.6.4** Doctor UI highlights abnormal values in red, critical in bold red

**Acceptance criteria:**

* Given HbA1c of 9.2% extracted, when flagging runs, then abnormal\_flags contains {test: "HbA1c", value: 9.2, severity: "abnormal"}  
* Reference ranges cite standard sources (documented in config file)

**Priority:** P0

---

#### **Module C — Summary Generation**

##### **C.1 Structured clinical summary**

**Description:** LLM synthesizes interview transcript and document data into a physician-ready summary.

**Requirements:**

* **C.1.1** Summary sections (allopathic mode):  
  * Chief Complaint  
  * History of Present Illness  
  * Past Medical History  
  * Past Surgical History  
  * Drug History  
  * Allergy History  
  * Family History  
  * Personal History (habits, occupation, marital status)  
  * Review of Systems  
  * Prior Investigations Summary  
  * Red Flags Noted  
* **C.1.2** Additional section for Ayurveda mode:  
  * Dashavidha Pariksha findings  
  * Ahara-Vihara assessment  
* **C.1.3** LLM prompt takes: full transcript \+ extracted document entities \+ red-flag markers \+ interview mode  
* **C.1.4** Output: structured JSON matching predefined schema  
* **C.1.5** Human-readable Markdown version generated from JSON  
* **C.1.6** Summary marked as `draft` — never approved by AI

**Acceptance criteria:**

* Given a completed interview and 2 uploaded documents, when finalize is triggered, then summary is generated within 15 seconds  
* Summary sections match predefined schema exactly (no LLM-invented sections)  
* Every claim in summary traceable to either transcript or document

**Priority:** P0

---

##### **C.2 Bilingual output**

**Description:** Summary is available in English and the patient's selected local language.

**Requirements:**

* **C.2.1** Doctor summary defaults to English (medical convention)  
* **C.2.2** Toggle allows switching to Hindi  
* **C.2.3** Patient's local language summary generated for audio confirmation only (not visible to doctor by default)  
* **C.2.4** Medical terminology preserved (drug names in Latin script, ICD codes universal)

**Acceptance criteria:**

* Given Hindi-speaking patient, when doctor toggles to Hindi, then summary text is in Devanagari script with correct medical terminology  
* Latin drug names (Amlodipine, Metformin) not translated

**Priority:** P1

---

##### **C.3 FHIR R4 bundle generation**

**Description:** Deterministic (non-LLM) generation of ABDM-compliant FHIR bundle.

**Requirements:**

* **C.3.1** Bundle type: `document`  
* **C.3.2** Resources included:  
  * Composition (the clinical note)  
  * Patient (with ABHA ID reference if available)  
  * Encounter (the OPD visit)  
  * Condition (for each diagnosis)  
  * MedicationStatement (for each medication)  
  * Observation (for each lab value)  
  * DocumentReference (for each uploaded document with signed URL)  
* **C.3.3** Bundle validated against ABDM FHIR profile  
* **C.3.4** Bundle stored in `summaries.fhir_bundle` JSONB  
* **C.3.5** Downloadable as JSON from doctor UI (for demo)

**Acceptance criteria:**

* Generated bundle passes ABDM FHIR validation (using ABDM validator tool)  
* All patient identifiers use appropriate FHIR Identifier resources

**Priority:** P0

---

##### **C.4 Doctor review interface**

**Description:** Doctor sees complete summary and can edit before approval.

**Requirements:**

* **C.4.1** Four tabs in patient detail view:  
  1. Structured Summary (default)  
  2. Full Transcript  
  3. Documents (timeline view)  
  4. Abnormal Flags  
* **C.4.2** Summary sections are editable (inline text editing)  
* **C.4.3** Doctor edits diffed against original AI draft  
* **C.4.4** Doctor can add free-text notes not present in AI draft  
* **C.4.5** Three action buttons: Approve, Approve with Edits, Reject  
* **C.4.6** Approve → summary status → `approved`, edits saved with diff, audit logged  
* **C.4.7** Reject → summary status → `rejected`, reason required, doctor takes manual history  
* **C.4.8** After approval (production): FHIR bundle push triggered to ABDM (mocked in MVP)

**Acceptance criteria:**

* Doctor can approve summary in under 30 seconds if AI output is accurate  
* All doctor edits captured in `summaries.doctor_edits` as text diffs

**Priority:** P0

---

#### **Module D — Consent, Privacy, ABDM Integration**

##### **D.1 DPDP compliance layer**

**Description:** System implements DPDP Act 2023 obligations.

**Requirements:**

* **D.1.1** Notice before consent (D.2)  
* **D.1.2** Granular consent (A.4)  
* **D.1.3** Easy revocation (A.5)  
* **D.1.4** Purpose limitation (every service checks consent scope)  
* **D.1.5** Data minimization (no unnecessary fields, hashed Aadhaar, discarded audio)  
* **D.1.6** Encryption in transit (TLS 1.3) and at rest (AES-256)  
* **D.1.7** Audit trail (D.4)  
* **D.1.8** Grievance contact displayed in notice: `grievance@medikiosk.in`

**Acceptance criteria:**

* Data protection review (self-conducted) confirms all 7 DPDP obligations addressed  
* Compliance checklist attached to PRD

**Priority:** P0

---

##### **D.2 ABDM alignment**

**Description:** System is architecturally ready for ABDM integration.

**Requirements:**

* **D.2.1** Consent record structure matches ABDM Consent Manager artifact format  
* **D.2.2** ABHA ID field on patient records  
* **D.2.3** HFR (Facility Registry) ID field on facility record (mock value for MVP)  
* **D.2.4** HPR (Healthcare Professional Registry) ID field on doctor records (mock)  
* **D.2.5** FHIR R4 bundle generation (C.3)  
* **D.2.6** Integration stubs for ABDM Consent Manager, Gateway, HIU/HIP APIs

**Acceptance criteria:**

* All ABDM identifier fields present in database schema even if mock values  
* Migration path to production ABDM defined in architecture document

**Priority:** P0

---

##### **D.3 Role-based access control**

**Description:** Data access restricted by role at service layer.

**Requirements:**

* **D.3.1** Reception queue endpoint returns logistics fields only (name, token, department, status, red\_flag boolean)  
* **D.3.2** Doctor queue endpoint returns full clinical fields, scoped to doctor's department  
* **D.3.3** JWT includes role claim; middleware enforces scope  
* **D.3.4** Test coverage confirms reception cannot access clinical endpoints even with valid JWT

**Acceptance criteria:**

* Given a receptionist JWT, when clinical endpoint called, then 403 Forbidden returned  
* Given a doctor JWT for Cardiology, when General Medicine patients queried, then 403 Forbidden

**Priority:** P0

---

##### **D.4 Audit logging**

**Description:** All privacy-relevant actions are logged.

**Requirements:**

* **D.4.1** Events logged:  
  * Consent granted (with scope, language, notice version)  
  * Consent revoked  
  * Reception login  
  * Doctor login  
  * Reception acknowledges red flag  
  * Doctor views summary  
  * Doctor edits summary  
  * Doctor approves/rejects summary  
  * FHIR bundle generated  
  * Session expired  
  * Session data purged  
* **D.4.2** Log entry structure: actor\_type, actor\_id, action, resource, timestamp, IP address, metadata JSONB  
* **D.4.3** Logs retained for 3 years (matches typical health record retention)  
* **D.4.4** Logs immutable — no update or delete operations exposed via API

**Acceptance criteria:**

* Every consent state change appears in audit log within 1 second  
* Audit log queryable by actor, action, or resource

**Priority:** P0

---

##### **D.5 Session lifecycle management**

**Description:** Sessions have defined lifecycle with automatic cleanup.

**Requirements:**

* **D.5.1** Session states: `started`, `consented`, `identified`, `interviewing`, `uploading`, `summarizing`, `summary_ready`, `in_review`, `approved`, `rejected`, `expired`, `revoked`  
* **D.5.2** Session timeout: 30 minutes inactivity → `expired`  
* **D.5.3** Cleanup cron every 15 minutes purges expired sessions  
* **D.5.4** Purge deletes: transcript, uploaded documents (from blob storage), consent details  
* **D.5.5** Purge retains: approved summary (if present), audit log entries  
* **D.5.6** Token expiry: 30 minutes from generation → invalidated

**Acceptance criteria:**

* Given a session inactive for 31 minutes, when cleanup runs, then session state is `expired` and blob storage documents deleted  
* Approved summary from expired session remains accessible

**Priority:** P0

---

#### **Reception Interface Features**

##### **R.1 Reception login**

**Description:** Receptionist authenticates before accessing dashboard.

**Requirements:**

* **R.1.1** Email \+ password authentication  
* **R.1.2** JWT with `role: reception` claim, 8-hour expiry  
* **R.1.3** Login attempts rate-limited (5 attempts / 5 minutes)

**Priority:** P0

---

##### **R.2 Reception dashboard**

**Description:** Home screen showing live patient list and alerts.

**Requirements:**

* **R.2.1** Three panels:  
  1. Red-flag alerts (pinned top, prominent)  
  2. Register new patient (form)  
  3. Live patient list (sortable table)  
* **R.2.2** Live patient list columns: Token, Name, Department, Status, Time in status, Red flag indicator  
* **R.2.3** Status values: `Registered`, `At kiosk`, `Interview in progress`, `Summary ready`, `With doctor`, `Complete`  
* **R.2.4** Updates in real-time via SSE  
* **R.2.5** Filter by status; search by name or token

**Priority:** P0

---

##### **R.3 Patient registration form**

**Description:** Receptionist registers new patient and generates token.

**Requirements:**

* **R.3.1** Form fields: name, age, gender, phone, department (dropdown)  
* **R.3.2** Identity path (radio buttons):  
  * ABHA ID: input field with format validation  
  * Aadhaar: input field with format validation (simulated verification)  
  * Walk-in: no additional fields  
* **R.3.3** Submit → creates patient record, creates token record, generates QR  
* **R.3.4** Result screen shows: token number in large font, printable QR, department name  
* **R.3.5** "Print slip" button opens print dialog

**Priority:** P0

---

##### **R.4 Red-flag alert handling**

**Description:** Receptionist sees and acknowledges red-flag alerts.

**Requirements:**

* **R.4.1** Alert appears at top of dashboard within 5 seconds of trigger  
* **R.4.2** Alert shows: token, patient name, red-flag category (e.g., "cardiac\_acute"), time since triggered  
* **R.4.3** Acknowledge button: marks alert as `acknowledged` with timestamp and receptionist\_id  
* **R.4.4** Alert continues showing until session is `with_doctor` or `complete`  
* **R.4.5** Receptionist cannot dismiss or downgrade the flag itself (only acknowledge)  
* **R.4.6** Audio ping on new alert (optional; toggleable)

**Priority:** P0

---

#### **Doctor Interface Features**

##### **DR.1 Doctor login**

**Description:** Doctor authenticates before accessing queue.

**Requirements:**

* **DR.1.1** Email \+ password authentication  
* **DR.1.2** JWT with `role: doctor` claim \+ department claim, 8-hour expiry  
* **DR.1.3** Login attempts rate-limited

**Priority:** P0

---

##### **DR.2 Doctor queue view**

**Description:** Doctor sees their department's patient queue with priority indicators.

**Requirements:**

* **DR.2.1** Three tiers displayed:  
  1. Red-flagged (pinned top, warning banner)  
  2. Summary ready (sorted by completion time, oldest first)  
  3. In progress (patient still at kiosk, informational, not clickable)  
* **DR.2.2** Each entry shows: token, name, age, gender, red flag indicator, completion time  
* **DR.2.3** Live updates via SSE  
* **DR.2.4** Click on patient → opens detail view  
* **DR.2.5** Only doctor's own department shown

**Priority:** P0

---

##### **DR.3 Patient detail view**

**Description:** Doctor reviews AI-generated content across four tabs.

**Requirements:**

* **DR.3.1** Four tabs (details in C.4)  
* **DR.3.2** Sidebar with patient basic info (name, age, gender, department, ABHA if linked)  
* **DR.3.3** Action buttons visible on all tabs: Approve, Approve with Edits, Reject

**Priority:** P0

---

##### **DR.4 Summary editing**

**Description:** Doctor can edit summary before approval.

**Requirements:**

* **DR.4.1** Each summary section is inline-editable (contenteditable or textarea)  
* **DR.4.2** "Add note" button for free-text additions  
* **DR.4.3** Save indicator shows unsaved changes  
* **DR.4.4** Edits captured as text diffs against original AI draft  
* **DR.4.5** Auto-save every 30 seconds during editing

**Priority:** P0

---

##### **DR.5 Approval and rejection**

**Description:** Doctor's final action commits or rejects the summary.

**Requirements:**

* **DR.5.1** Approve: summary state → `approved`, edits saved, audit logged, FHIR push triggered (mocked)  
* **DR.5.2** Reject: modal asks for reason (dropdown \+ free text), summary state → `rejected`, audit logged  
* **DR.5.3** After action: doctor returned to queue view  
* **DR.5.4** Approved/rejected patients moved out of queue

**Priority:** P0

---

### **5\. Non-Functional Requirements**

#### **5.1 Performance**

| Metric | Target |
| ----- | ----- |
| Kiosk turn latency (input → next question) | \< 3 seconds |
| Summary generation time | \< 15 seconds |
| Doctor queue refresh latency (SSE) | \< 2 seconds |
| Reception dashboard alert latency | \< 5 seconds |
| Document OCR completion | 90% under 30 seconds |
| Total patient time at kiosk (typical) | 8–12 minutes |
| Concurrent kiosk sessions supported | 20 (MVP) |
| Concurrent doctors supported | 10 (MVP) |

#### **5.2 Availability**

* Target: 99% uptime during OPD hours (8 AM – 8 PM IST)  
* No SLA for off-hours (maintenance windows acceptable)  
* Graceful degradation: if AI providers fail, system falls back to hardcoded questions and text input; system never becomes unusable

#### **5.3 Security**

* TLS 1.3 for all network traffic  
* AES-256 for sensitive fields at rest  
* JWTs signed with rotating secrets  
* All secrets in environment variables, never in code  
* Signed URLs for blob storage (15-minute expiry)  
* Rate limits on all authentication endpoints

#### **5.4 Accessibility**

* Minimum font size: 18pt on kiosk, 14pt on other interfaces  
* High contrast mode available  
* All prompts have audio playback  
* Every screen operable without reading (icon-driven)  
* Touch targets minimum 44x44 pixels  
* Screen reader compatible (WCAG 2.1 AA target)

#### **5.5 Localization**

* MVP languages: English, Hindi, one regional (TBD)  
* All UI strings externalized (i18n JSON files)  
* Language-specific TTS audio pre-generated for common prompts  
* Medical terminology preserved across languages where clinically important

#### **5.6 Data residency**

* All data stored on India-region infrastructure (DigitalOcean Bangalore or AWS Mumbai)  
* No cross-border data transfer in MVP

---

### **6\. Technical Architecture Summary**

See separate Architecture Document for full details. Summary:

* **Frontend:** React 18 \+ Vite \+ TypeScript \+ Tailwind \+ Zustand  
* **Backend:** FastAPI (Python 3.11+) monolith with modular services  
* **Database:** PostgreSQL 16 with JSONB  
* **Cache/Pub-Sub:** Redis 7+  
* **Blob Storage:** MinIO (self-hosted for MVP)  
* **AI Providers:** Claude 3.5 Sonnet (LLM), AI4Bharat (ASR/TTS), Google Cloud Vision (OCR)  
* **Deployment:** Docker Compose on single VM (2GB RAM, 2 vCPU)

---

### **7\. Data Model Summary**

Tables:

* `patients` (id, name, age, gender, phone, abha\_id, aadhaar\_hash, created\_at)  
* `receptionists` (id, name, email, password\_hash, facility\_id)  
* `doctors` (id, name, email, password\_hash, department\_id, hpr\_id)  
* `departments` (id, name, interview\_mode)  
* `tokens` (id, patient\_id, department\_id, receptionist\_id, expires\_at, used\_at)  
* `intake_sessions` (id, patient\_id, token\_id, department\_id, language, state, priority\_flag, priority\_tier, started\_at, expires\_at)  
* `consents` (id, session\_id, scope, granted\_at, revoked\_at, language, notice\_version, audio\_played)  
* `transcripts` (id, session\_id, turns\_json, red\_flags\_triggered\_json)  
* `documents` (id, session\_id, blob\_url, doc\_type, document\_date, extracted\_entities\_json, abnormal\_flags\_json, ocr\_confidence, processing\_status)  
* `summaries` (id, session\_id, structured\_json, fhir\_bundle\_json, status, doctor\_id, approved\_at, doctor\_edits\_json)  
* `audit_logs` (id, actor\_type, actor\_id, action, resource\_type, resource\_id, metadata, timestamp, ip\_address)

---

### **8\. API Surface Summary**

See separate API Specification for full details. Key endpoints grouped by client:

**Reception:**

* `POST /auth/reception/login`  
* `GET /reception/queue`  
* `GET /reception/queue/stream` (SSE)  
* `POST /reception/patients`  
* `POST /reception/tokens`  
* `POST /reception/alerts/{id}/acknowledge`

**Kiosk (via token):**

* `GET /kiosk/tokens/{id}`  
* `POST /kiosk/sessions/{id}/language`  
* `POST /kiosk/sessions/{id}/consent`  
* `POST /kiosk/sessions/{id}/consent/revoke`  
* `POST /kiosk/sessions/{id}/interview/turn`  
* `POST /kiosk/sessions/{id}/documents`  
* `GET /kiosk/sessions/{id}/qr-upload-url`  
* `POST /kiosk/sessions/{id}/finalize`  
* `GET /kiosk/sessions/{id}/summary`

**Phone upload (via one-time token):**

* `POST /upload/{token}`

**Doctor:**

* `POST /auth/doctor/login`  
* `GET /doctor/queue`  
* `GET /doctor/queue/stream` (SSE)  
* `GET /doctor/sessions/{id}`  
* `PATCH /doctor/sessions/{id}/summary`  
* `POST /doctor/sessions/{id}/approve`  
* `POST /doctor/sessions/{id}/reject`

---

### **9\. Success Metrics for Demo**

Measurable outcomes to demonstrate to judges:

* **Time savings:** Doctor's history-taking time reduced from typical 3 minutes to under 1 minute (67% reduction)  
* **History completeness:** Summary covers all SOCRATES dimensions in 95%+ of cases  
* **Red-flag latency:** Emergency conditions detected and routed within 5 seconds  
* **Language coverage:** Full flow works in 3 languages during demo  
* **Document processing:** OCR \+ entity extraction successful on 8 of 10 sample documents  
* **DPDP compliance:** Live demo of consent, revocation, purge; audit log query  
* **ABDM readiness:** FHIR bundle downloadable, passes ABDM validator

---

### **10\. Risks and Mitigations**

| Risk | Likelihood | Impact | Mitigation |
| ----- | ----- | ----- | ----- |
| Handwritten OCR quality poor | High | High | Test early with real prescriptions; flag low-confidence for physician review |
| AI provider downtime during demo | Medium | Critical | Demo-mode cache with pre-recorded AI responses |
| ASR quality poor in noisy environment | High | High | Test with real background noise from day 3; ensure touch fallback works |
| Judge questions about ABDM production integration | High | Medium | Prepared answer: interface stubs match contracts, 6–8 week production path |
| Team member drops out mid-hackathon | Medium | High | Two people own every component; documentation in shared docs |
| Ayurveda domain knowledge insufficient | Medium | Medium | Consult BAMS student; reference textbooks; keep Ayurveda mode simple |
| Integration bugs on day 8+ | High | High | End-to-end demo every day; no big-bang integration |

---

### **11\. Open Decisions (to close before Day 1\)**

* Regional language: Tamil / Marathi / Bengali / Telugu?  
* Backend framework confirmed: FastAPI (Python) or Express (Node)?  
* LLM provider confirmed: Claude 3.5 Sonnet?  
* OCR provider confirmed: Google Cloud Vision?  
* VM host: DigitalOcean Bangalore or AWS Mumbai?  
* Team role assignments finalized?

---

### **12\. Change Log**

| Date | Change | Author |
| ----- | ----- | ----- |
| Day 0 | Initial PRD | Team Lead |

---

### **Appendix A — Glossary**

* **ABDM:** Ayushman Bharat Digital Mission  
* **ABHA:** Ayushman Bharat Health Account (unique health ID for Indian citizens)  
* **AYUSH:** Ayurveda, Yoga, Unani, Siddha, Homeopathy  
* **DPDP:** Digital Personal Data Protection Act 2023  
* **FHIR:** Fast Healthcare Interoperability Resources (health data exchange standard)  
* **HFR:** Health Facility Registry (part of ABDM)  
* **HIS:** Hospital Information System  
* **HIU/HIP:** Health Information User / Provider (roles in ABDM)  
* **HPR:** Healthcare Professional Registry (part of ABDM)  
* **OPD:** Outpatient Department  
* **PWA:** Progressive Web Application  
* **SSE:** Server-Sent Events (real-time server-to-client streaming)  
* **SOCRATES:** Site, Onset, Character, Radiation, Associations, Timing, Exacerbating factors, Severity (pain assessment framework)  
* **Dashavidha Pariksha:** Tenfold Ayurvedic examination (Prakriti, Vikriti, Sara, Samhanana, Pramana, Satmya, Sattva, Ahara Shakti, Vyayama Shakti, Vaya)

---

### **Appendix B — Referenced Standards**

* FHIR R4 (HL7)  
* ABDM FHIR Implementation Guide  
* DPDP Act 2023  
* ICD-10 (World Health Organization)  
* WCAG 2.1 AA (Web Content Accessibility Guidelines)

---

**End of PRD.**

