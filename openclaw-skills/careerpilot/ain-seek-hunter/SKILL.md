---
name: careerpilot-ain-seek-hunter
description: "Search seek.com.au Healthcare & Medical section for Assistant in Nursing and aged care roles. Scores against AIN profile, tailors materials with compassionate tone."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# AIN Seek Hunter

Searches seek.com.au Healthcare & Medical section for Assistant in Nursing and aged care roles. Scores against AIN profile, tailors materials with compassionate tone.

## Trigger phrases
- "Find AIN jobs in Sydney on Seek"
- "Search Seek for aged care worker in Sydney"
- "Run AIN job hunt for disability support worker"
- "Find personal care assistant jobs on Seek"

## Instructions

### Step 1 — Open Seek Healthcare
1. Open browser to: https://www.seek.com.au/healthcare-medical-jobs
2. In "What" field, type: {keywords from user}
3. In "Where" field, type: {location from user}
4. Click Search
5. Set sort to "Date listed" (most recent first)

### Step 2 — Collect job listings
For each job card visible (up to 20):
- Extract: job title, company name, location, salary (if shown), URL
- Store as a list

### Step 3 — Fetch job descriptions
For each job:
1. Open the job URL
2. Copy the full job description text
3. Close the tab
4. Wait 2-3 seconds before the next

### Step 4 — Load profile
Follow the common skill instructions to load the `ain` profile.

### Step 5 — Score each job
Score each job 0-100 for fit against the AIN resume. Use the AIN profile's `min_match_score` (default 60).

### Step 6 — Tailor materials for qualifying jobs
For each job scoring >= min_match_score:
- Tailor resume (AIN tone: compassionate, person-centred, care-focused)
- Write cover letter (3 paragraphs, under 220 words)
- If `include_references_in_tailored` is true in preferences, include references
- Save job details

### Step 7 — Log to Excel
Open or create `~/careerpilot/data/applications.xlsx`.
Append one row per processed job.

### Step 8 — Report back
Tell the user: jobs found, jobs qualified, list with scores, output folder location.

## Configuration
- Profile: `ain`
- Resume: `~/careerpilot/data/profiles/ain/resume.md`
- Preferences: `~/careerpilot/data/profiles/ain/preferences.md`
- Output: `~/careerpilot/output/ain/`

## Notes
- Seek Healthcare section has different DOM than general Seek — selectors may differ
- AIN roles often list specific certifications required (Certificate III, First Aid, CPR, Police Check, NDIS Screening)
- Some roles list shift times — note these in job_details.md
- Run once per day maximum
