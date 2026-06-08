# AIN Jora Hunter

Searches Jora.com.au for Assistant in Nursing and aged care roles. Jora is a popular job aggregator in Australia with many AIN listings.

## Trigger phrases
- "Find AIN jobs on Jora in Sydney"
- "Search Jora for aged care worker"
- "Jora job hunt for disability support worker"

## Instructions

### Step 1 — Search Jora Australia
1. Open browser to: https://www.jora.com
2. In the first search field enter: {keywords} (e.g., "Assistant in Nursing", "AIN", "aged care")
3. In the location field enter: {location}
4. Click "Search"
5. Sort by: Date (most recent)

### Step 2 — Collect listings
For each job card (up to 20):
- Extract: title, company, location, salary (if shown), URL
- Note which jobs link to external sites vs Jora's apply flow

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
List qualifying jobs. Note which link to external apply sites.

## Notes
- Jora aggregates from many sources — some jobs may be duplicates of Seek/Indeed listings
- Check the URL domain to identify the original source
- Most Jora AIN jobs redirect to the provider's career site
- Jora has lighter anti-bot measures than LinkedIn/Indeed
