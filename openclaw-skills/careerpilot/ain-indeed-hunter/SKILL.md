---
name: careerpilot-ain-indeed-hunter
description: "Search Indeed.com.au for aged care, disability support, and nursing assistant roles. Scores against AIN profile, tailors materials with compassionate tone."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# AIN Indeed Hunter

Searches Indeed.com.au for aged care, disability support, and nursing assistant roles. Scores against AIN profile, tailors materials with compassionate tone.

## Trigger phrases
- "Find AIN jobs on Indeed in Sydney"
- "Search Indeed for aged care worker roles"
- "Indeed job hunt for disability support worker"

## Instructions

### Step 1 — Search Indeed Australia
1. Open browser to: https://au.indeed.com
2. In "What" field enter: {keywords}
3. In "Where" field enter: {location}
4. Click "Find jobs"
5. Sort by: Date (most recent)

### Step 2 — Collect listings
For each job card on the first page (up to 20):
- Extract: title, company, location, salary (if shown), URL
- Note "Easily apply" badges

### Step 3 — Fetch descriptions
For each job:
1. Click the job card
2. Copy the full description from the right panel
3. Wait 2 seconds before clicking next

### Step 4 — Load profile and score
Follow the common skill instructions to load the `ain` profile.
Score each job 0-100 for candidate fit.

### Step 5 — Tailor materials for qualifying jobs (score >= 60)
Tailor resume and cover letter per job using AIN tone (compassionate, person-centred).

Save to: `~/careerpilot/output/ain/{date}_{company}_{slug}/`

### Step 6 — Log to Excel
Append to `~/careerpilot/data/applications.xlsx`
Set Source = "indeed"

### Step 7 — Report back
List qualifying jobs. Note which have "Easily apply".

## Notes
- Indeed.com.au has a CAPTCHA system — if triggered, complete it manually
- AIN roles on Indeed often include home care, community care, and facility work
- Note shift types (morning/afternoon/night) in job details
- Run once per day maximum
