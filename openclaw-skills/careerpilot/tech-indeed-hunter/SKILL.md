---
name: careerpilot-tech-indeed-hunter
description: "Search Indeed.com.au for software engineering jobs, score against tech profile resume, tailor application materials for qualifying matches."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# Tech Indeed Hunter

Searches Indeed.com.au for software engineering jobs, scores against tech profile resume, tailors application materials for qualifying matches.

## Trigger phrases
- "Find software engineer jobs on Indeed in Sydney"
- "Search Indeed for full stack developer roles"
- "Indeed job hunt for React developer"

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
- Note "Easily apply" badges — these have a simplified form

### Step 3 — Fetch descriptions
For each job:
1. Click the job card
2. Copy the full description from the right panel
3. Wait 2 seconds before clicking next

### Step 4 — Load profile and score
Follow the common skill instructions to load the `tech` profile.
Score each job 0-100 for candidate fit.

### Step 5 — Tailor materials for qualifying jobs (score >= 65)
Tailor resume and cover letter per job.

Save to: `~/careerpilot/output/tech/{date}_{company}_{slug}/`

### Step 6 — Log to Excel
Append to `~/careerpilot/data/applications.xlsx`
Set Source = "indeed"

### Step 7 — Report back
List qualifying jobs. Note which have "Easily apply".

## How to apply after the skill runs

FOR "Easily apply" jobs:
1. Open the job URL
2. Click "Easily apply" or "Apply now"
3. Fill the form using your tailored resume content
4. Paste cover letter text into the cover letter field
5. Submit yourself

## Notes
- Indeed.com.au has a CAPTCHA system — if triggered, complete it manually
- Some Indeed jobs redirect to the company's ATS — have your materials ready
- "Easily apply" jobs typically only need resume + optional cover letter
- Run once per day maximum
