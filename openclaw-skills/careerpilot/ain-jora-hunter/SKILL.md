---
name: careerpilot-ain-jora-hunter
description: "Search Jora.com.au for aged care and disability support roles. Jora aggregates from multiple job boards. Scores against AIN profile, tailors materials."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# AIN Jora Hunter

Searches Jora.com.au for aged care and disability support roles. Jora aggregates from multiple job boards, giving broader coverage. Scores against AIN profile, tailors materials.

## Trigger phrases
- "Find AIN jobs on Jora in Sydney"
- "Search Jora for aged care worker roles"
- "Jora job hunt for disability support worker"

## Instructions

### Step 1 — Search Jora Australia
1. Open browser to: https://www.jora.com.au
2. In first search field enter: {keywords}
3. In second field enter: {location}
4. Click "Search"
5. Sort by: Date (most recent)

### Step 2 — Collect listings
For each job card on the first page (up to 20):
- Extract: title, company, location, salary (if shown), URL, source board
- Note which board the job came from (Seek, Indeed, etc.)

### Step 3 — Fetch descriptions
For each job:
1. Click the job card
2. Copy the full description
3. Wait 2 seconds before clicking next

### Step 4 — Load profile and score
Follow the common skill instructions to load the `ain` profile.
Score each job 0-100 for candidate fit.

### Step 5 — Tailor materials for qualifying jobs (score >= 60)
Tailor resume and cover letter per job.

Save to: `~/careerpilot/output/ain/{date}_{company}_{slug}/`

### Step 6 — Log to Excel
Append to `~/careerpilot/data/applications.xlsx`
Set Source = "jora"
Note original source board in notes

### Step 7 — Report back
List qualifying jobs with source boards.

## Notes
- Jora aggregates from Seek, Indeed, and other boards
- Some jobs may be duplicates of what other hunters found
- Check for duplicates before tailoring
- Run once per day maximum
