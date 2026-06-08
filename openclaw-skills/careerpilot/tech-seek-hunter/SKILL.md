---
name: careerpilot-tech-seek-hunter
description: "Search seek.com.au for software engineering jobs, score against tech profile resume, tailor application materials for qualifying matches."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# Tech Seek Hunter

Searches seek.com.au for software engineering jobs, scores against the tech profile resume, tailors application materials for qualifying matches.

## Trigger phrases
- "Find software engineer jobs in Sydney on Seek"
- "Search Seek for React developer in Sydney"
- "Run tech job hunt for full stack developer"
- "Find frontend engineer jobs remote on Seek"

## Instructions

### Step 1 — Open Seek
1. Open browser to: https://www.seek.com.au
2. In "What" field, type: {keywords from user}
3. In "Where" field, type: {location from user}
4. Click Search
5. Set sort to "Date listed" (most recent first)

### Step 2 — Collect job listings
For each job card visible on the first page (up to 20):
- Extract: job title, company name, location, salary (if shown), URL
- Store as a list

### Step 3 — Fetch job descriptions
For each job in your list:
1. Open the job URL in a new tab
2. Find and copy the full job description text
3. Close the tab
4. Wait 2-3 seconds before the next (rate limit)

### Step 4 — Load profile
Follow the common skill instructions to load the `tech` profile.

### Step 5 — Score each job
Score each job 0-100 for fit against the tech resume. Use the tech profile's `min_match_score` (default 65).

### Step 6 — Tailor materials for qualifying jobs
For each job scoring >= min_match_score:
- Tailor resume (tech tone: confident, technical, metrics-driven)
- Write cover letter (3 paragraphs, under 220 words)
- Save job details

### Step 7 — Log to Excel
Open or create `~/careerpilot/data/applications.xlsx`.
Append one row per processed job.

### Step 8 — Report back
Tell the user: jobs found, jobs qualified, list with scores, output folder location.

## Configuration
- Profile: `tech`
- Resume: `~/careerpilot/data/profiles/tech/resume.md`
- Preferences: `~/careerpilot/data/profiles/tech/preferences.md`
- Output: `~/careerpilot/output/tech/`

## Notes
- This skill does NOT auto-submit — materials are saved for review
- Seek's layout changes occasionally — if step 2 fails, try navigating manually first
- Run once per day maximum
