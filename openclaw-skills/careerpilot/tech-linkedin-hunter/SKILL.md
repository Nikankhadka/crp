---
name: careerpilot-tech-linkedin-hunter
description: "Search LinkedIn Jobs for software engineering roles using public listings only. Scores against tech profile, flags Easy Apply jobs, tailors application materials."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# Tech LinkedIn Hunter

Searches LinkedIn Jobs for software engineering roles using public listings only (no login required). Scores against tech profile, flags Easy Apply jobs, tailors application materials.

## IMPORTANT — LinkedIn safety rules
- Only search public job listings (no login required to see them)
- Do NOT auto-submit LinkedIn Easy Apply without your review
- Do NOT send connection requests automatically
- Do NOT collect recruiter contact information
- This skill generates draft materials — YOU click submit

## Trigger phrases
- "Find software engineer jobs on LinkedIn in Sydney"
- "Search LinkedIn for full stack developer roles"
- "LinkedIn job hunt for React developer in Sydney"

## Instructions

### Step 1 — Search LinkedIn Jobs (no login needed)
1. Open browser to: https://www.linkedin.com/jobs/search
2. Search keywords: {keywords from user}
3. Location: {location from user}
4. Filter: "Past 24 hours" or "Past week" (most recent)
5. Sort by: "Most recent"

### Step 2 — Collect listings
For each visible job card (up to 20):
- Extract: title, company, location, "Easy Apply" badge (yes/no), job URL
- Note which ones have "Easy Apply" — these can be applied to within LinkedIn

### Step 3 — Fetch descriptions
For each job:
1. Click the job card to expand the description panel on the right
2. Copy the full job description
3. Wait 3 seconds before clicking the next card (important — LinkedIn detects fast clicking)

### Step 4 — Load profile and score
Follow the common skill instructions to load the `tech` profile.
Score each job 0-100 for candidate fit.

### Step 5 — Tailor materials for qualifying jobs (score >= 65)
Same as Seek skill — tailor resume and cover letter per job.

Save to: `~/careerpilot/output/tech/{date}_{company}_{slug}/`

### Step 6 — Flag Easy Apply jobs
In job_details.md, add a note:
"EASY APPLY AVAILABLE — you can apply directly on LinkedIn using the tailored materials above"

### Step 7 — Log to Excel
Append to `~/careerpilot/data/applications.xlsx`
Set Source = "linkedin"

### Step 8 — Report back
List qualifying jobs. Highlight which ones have Easy Apply for fastest application.

## How to apply after the skill runs

FOR EASY APPLY jobs:
1. Open the job URL from job_details.md
2. Click "Easy Apply"
3. Paste the cover letter text when prompted
4. Upload your resume (convert resume.md to PDF using document-converter skill)
5. Review all fields and click Submit yourself

FOR regular LinkedIn jobs:
1. Open the job URL
2. Click "Apply" — it opens the company's external site
3. Use your tailored materials

## Notes
- LinkedIn detects very fast automated clicking — the 3-second delay between cards is required
- If LinkedIn shows a CAPTCHA, stop and complete it manually before continuing
- Run once per day maximum
