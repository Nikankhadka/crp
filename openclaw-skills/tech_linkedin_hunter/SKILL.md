# Tech LinkedIn Hunter

Searches LinkedIn Jobs for software engineering roles. Public listings only — no login scraping.

## Safety rules
- Only search public job listings (no login required)
- Do NOT auto-submit LinkedIn Easy Apply
- Do NOT send connection requests
- Do NOT collect recruiter contact information
- This skill generates draft materials — YOU click submit

## Trigger phrases
- "Find software engineer jobs on LinkedIn in Sydney"
- "Search LinkedIn for React developer"
- "LinkedIn job hunt for full stack engineer"

## Instructions

### Step 1 — Search LinkedIn Jobs (no login needed)
1. Open browser to: https://www.linkedin.com/jobs/search
2. Search keywords: {keywords from user}
3. Location: {location from user}
4. Filter: "Past 24 hours" or "Past week"
5. Sort by: "Most recent"

### Step 2 — Collect listings
For each visible job card (up to 20):
- Extract: title, company, location, "Easy Apply" badge (yes/no), job URL
- Note which have "Easy Apply"

### Step 3 — Fetch descriptions
For each job:
1. Click the job card to expand the description panel
2. Copy the full job description
3. Wait 3 seconds before clicking next card (LinkedIn detects fast clicking)

### Step 4 — Load profile
Follow the common skill instructions to load the `tech` profile.

### Step 5 — Score and tailor
Score each job. Tailor materials for those scoring >= min_match_score.
Save to: `~/careerpilot/output/tech/{date}_{company}_{slug}/`

### Step 6 — Flag Easy Apply jobs
In job_details.txt, note: "EASY APPLY AVAILABLE — you can apply directly on LinkedIn"

### Step 7 — Log to Excel
Append to `~/careerpilot/data/applications.xlsx`

### Step 8 — Report back
List qualifying jobs. Highlight Easy Apply ones.

## How to apply
1. Open the job URL
2. Click "Easy Apply" if available
3. Upload tailored resume, paste cover letter
4. Review all fields and click Submit yourself

## Notes
- Do not run while logged out — descriptions are more visible when logged in
- LinkedIn detects fast clicking — 3-second delay is required
- If CAPTCHA appears, stop and complete manually before continuing
