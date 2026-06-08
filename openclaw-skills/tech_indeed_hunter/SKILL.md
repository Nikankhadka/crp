# Tech Indeed Hunter

Searches Indeed.com.au for software engineering roles with tailored application materials.

## Trigger phrases
- "Find software engineer jobs on Indeed in Sydney"
- "Search Indeed for React developer"
- "Indeed job hunt for full stack developer"

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

### Step 4 — Load profile
Follow the common skill instructions to load the `tech` profile.

### Step 5 — Score and tailor
Score each job. Tailor materials for those scoring >= min_match_score.
Save to: `~/careerpilot/output/tech/{date}_{company}_{slug}/`

### Step 6 — Log to Excel
Append to `~/careerpilot/data/applications.xlsx`

### Step 7 — Report back
List qualifying jobs. Note which have "Easily apply".

## How to apply
1. Open the job URL
2. Click "Easily apply" or "Apply now"
3. Fill the form using tailored materials
4. Submit yourself

## Notes
- Indeed.com.au has CAPTCHA — if triggered, complete manually
- Some jobs redirect to company ATS — have materials ready
- "Easily apply" jobs typically only need resume + optional cover letter
