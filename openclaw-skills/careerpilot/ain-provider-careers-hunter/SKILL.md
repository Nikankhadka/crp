---
name: careerpilot-ain-provider-careers-hunter
description: "Search major aged care provider career sites directly (Bupa, Regis, Opal, UnitingCare, Estia). Scores against AIN profile, tailors materials."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# AIN Provider Careers Hunter

Searches major aged care provider career sites directly. Many providers post jobs on their own sites before (or instead of) job boards. Scores against AIN profile, tailors materials.

## Trigger phrases
- "Find AIN jobs on provider career sites"
- "Search Bupa, Regis, Opal careers for aged care roles"
- "Check provider career sites for disability support worker roles"

## Instructions

### Step 1 — Visit provider career sites
Visit each provider's career page in sequence:

1. **Bupa Aged Care**: https://www.bupa.com.au/careers
2. **Regis Care**: https://www.regiscare.com.au/careers
3. **Opal Health**: https://www.opalhealth.com.au/careers
4. **UnitingCare**: https://www.unitingcare.com.au/careers
5. **Estia Health**: https://www.estiahealth.com.au/careers
6. **HammondCare**: https://www.hammondcare.org/careers
7. **Home Instead**: https://www.homeinstead.com.au/careers
8. **Right at Home**: https://www.rightathome.com.au/careers

### Step 2 — Search for AIN roles
On each site:
1. Search for: "AIN", "Assistant in Nursing", "Aged Care Worker", "Disability Support"
2. Filter by location: Sydney, NSW
3. Sort by: Most recent

### Step 3 — Collect listings
For each job found:
- Extract: title, facility/location, URL, posted date
- Note: employment type, shift times (if shown)

### Step 4 — Fetch descriptions
For each job:
1. Open the job URL
2. Copy the full description
3. Wait 3 seconds before next

### Step 5 — Load profile and score
Follow the common skill instructions to load the `ain` profile.
Score each job 0-100 for candidate fit.

### Step 6 — Tailor materials for qualifying jobs (score >= 60)
Tailor resume and cover letter per job.

Save to: `~/careerpilot/output/ain/{date}_{company}_{slug}/`

### Step 7 — Log to Excel
Append to `~/careerpilot/data/applications.xlsx`
Set Source = "provider"
Note provider name in notes

### Step 8 — Report back
List qualifying jobs grouped by provider.

## Notes
- Provider sites have different layouts — may need manual navigation
- Some providers use third-party ATS (Workday, SuccessFactors)
- Provider-direct jobs may not appear on Seek/Indeed
- Run once per day maximum
