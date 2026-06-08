# AIN Indeed Hunter

Searches Indeed.com.au for Assistant in Nursing and aged care roles.

## Trigger phrases
- "Find AIN jobs on Indeed in Sydney"
- "Search Indeed for aged care worker"
- "Indeed job hunt for disability support worker"

## Instructions

### Step 1 — Search Indeed Australia
1. Open browser to: https://au.indeed.com
2. In "What" field enter: {keywords} (e.g., "Assistant in Nursing", "AIN", "aged care worker")
3. In "Where" field enter: {location}
4. Click "Find jobs"
5. Sort by: Date (most recent)

### Step 2 — Collect listings
For each job card (up to 20):
- Extract: title, company, location, salary (if shown), URL
- Note "Easily apply" badges

### Step 3 — Fetch descriptions
For each job:
1. Click the job card
2. Copy the full description
3. Wait 2 seconds before clicking next

### Step 4 — Load profile
Follow the common skill instructions to load the `ain` profile.

### Step 5 — Score and tailor
Score each job. Tailor materials for those scoring >= min_match_score.
AIN tone: compassionate, person-centred, care-focused.
Save to: `~/careerpilot/output/ain/{date}_{company}_{slug}/`

### Step 6 — Log to Excel
Append to `~/careerpilot/data/applications.xlsx`

### Step 7 — Report back
List qualifying jobs. Note which have "Easily apply".

## Notes
- Indeed has CAPTCHA — complete manually if triggered
- AIN roles on Indeed often redirect to provider ATS portals
- "Easily apply" jobs typically need resume + optional cover letter
- Note shift times and certification requirements in job_details.md
