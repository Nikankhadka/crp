# AIN Provider Careers Hunter

Searches aged care provider career sites directly. Many providers only post on their own sites.

## Target providers
- Bupa Aged Care: https://www.bupa.com.au/careers
- Opal HealthCare: https://www.opalhealthcare.com.au/careers
- Regis Care: https://www.regiscare.com.au/careers
- HammondCare: https://www.hammondcare.com/about-us/careers
- Estia Health: https://www.estiahealth.com.au/careers
- Uniting: https://www.uniting.org/care-services/careers
- BaptistCare: https://www.baptistcare.com.au/careers
- Mercy Aged Care: https://www.mercyagedcare.com.au/careers
- Anglicare: https://www.anglicare.org.au/careers
- Aged Care Jobs (aggregator): https://www.agedcarejobs.com.au

## Trigger phrases
- "Find AIN jobs on provider sites in Sydney"
- "Search Bupa and Regis for aged care worker"
- "Run provider careers hunt for AIN"

## Instructions

### Step 1 — Visit each provider career site
For each provider in the target list:
1. Open the careers URL
2. Search for: {keywords} (e.g., "Assistant in Nursing", "AIN", "Personal Care Worker")
3. Filter by location: {location}
4. Sort by: Most recent

### Step 2 — Collect listings
For each job found:
- Extract: title, company (provider name), location, URL
- Note application deadline if shown

### Step 3 — Fetch descriptions
For each job:
1. Open the job URL
2. Copy the full job description
3. Wait 2-3 seconds before next

### Step 4 — Load profile
Follow the common skill instructions to load the `ain` profile.

### Step 5 — Score and tailor
Score each job. Tailor materials for those scoring >= min_match_score.
AIN tone: compassionate, person-centred, care-focused.
Save to: `~/careerpilot/output/ain/{date}_{company}_{slug}/`

### Step 6 — Log to Excel
Append to `~/careerpilot/data/applications.xlsx`
Set Source = "provider"

### Step 7 — Report back
List qualifying jobs grouped by provider. Note application deadlines.

## Notes
- Each provider site has a different layout — selectors will vary
- Some providers require creating an account before applying
- Some require answering key selection criteria in free text
- Most require uploading resume + cover letter as PDF/DOCX
- Note certification requirements (Certificate III, First Aid, CPR, Police Check, NDIS Screening)
- Provider sites have lighter anti-bot measures than major job boards
