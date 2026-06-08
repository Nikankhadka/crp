# Common — Shared Instructions

Shared logic for all CareerPilot OpenClaw skills.

## Loading the profile

1. Determine which profile to use from the trigger phrase:
   - "tech" / "software engineer" / "developer" → `tech`
   - "ain" / "aged care" / "nursing" / "disability" → `ain`
2. Load resume from: `~/careerpilot/data/profiles/{profile}/resume.md`
3. Load cover letter from: `~/careerpilot/data/profiles/{profile}/cover_letter.md`
4. Load preferences from: `~/careerpilot/data/profiles/{profile}/preferences.md`
5. Load shared blacklist from: `~/careerpilot/data/shared/blacklist.md`

## Scoring

For each job, score the candidate's fit 0-100 based on:
- Skills overlap with job requirements
- Experience relevance
- Location match
- Salary alignment (if listed)

Use the profile's `min_match_score` from preferences.md as the threshold.

## Tailoring

For qualifying jobs (score >= min_match_score):

**Resume**: Load the profile's resume.md. Rewrite the summary to target this specific role. Reorder experience bullets to surface the most relevant ones first. Incorporate missing keywords naturally where honestly applicable. Never invent experience. Save to `~/careerpilot/output/{profile}/{date}_{company}_{slug}/resume_tailored.md`.

**Cover letter**: Write a 3-paragraph cover letter under 220 words. Use the profile's tone from preferences.md. Save to `~/careerpilot/output/{profile}/{date}_{company}_{slug}/cover_letter.txt`.

**Job details**: Save URL, score, what to emphasise, missing keywords to `~/careerpilot/output/{profile}/{date}_{company}_{slug}/job_details.md`.

## Guardrails

- Maximum applications per day: check `max_daily_applications` in preferences.md
- Cooldown between actions: wait 2-5 seconds between page loads
- Never apply to companies in the blacklist
- If a CAPTCHA appears: stop, report to user, mark job as `manual_required`
- Log every action to `~/careerpilot/logs/{date}_run.log`

## Output structure

```
~/careerpilot/output/{profile}/{date}_{company}_{slug}/
├── job_details.md
├── resume_tailored.md
├── cover_letter.txt
└── scout_notes.md
```

## Reporting

After each run, tell the user:
- How many jobs found
- How many qualified (score >= threshold)
- List qualifying jobs with scores
- Confirm output folder location
- Any errors or blocked jobs (captcha, blacklist, etc.)
