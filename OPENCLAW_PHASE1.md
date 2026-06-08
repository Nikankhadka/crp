# OpenClaw Phase 1 — Job Application Guide
# Apply to Seek, LinkedIn, and Indeed using free AI — zero code required

---

## What OpenClaw gives you for free

- Self-hosted agent on your machine
- Computer Use (controls your browser)
- OpenRouter free LLMs wired in (3 free models, no card needed)
- Discord + Telegram + WhatsApp interface
- Skill files = reusable task templates
- Scheduled runs (HEARTBEAT.md)
- Memory across sessions (MEMORY.md)
- $0 total cost

---

## Step 1 — Install OpenClaw (5 min)

```bash
# Mac / Linux
curl -fsSL https://clawd.bot/install.sh | bash

# Windows (PowerShell)
iwr -useb https://clawd.bot/install.ps1 | iex

# Or via npm
npm install -g openclaw
openclaw start
```

OpenClaw opens a browser window with its interface at localhost:3456

---

## Step 2 — Configure OpenRouter free API (3 min)

1. Go to https://openrouter.ai/keys → sign up free → create a key
2. In OpenClaw: **Help → Developer Mode** (toggle on)
3. **Developer menu → Configure Third-party inference**
4. Enter:
   ```
   Gateway URL:  https://openrouter.ai/api/v1
   API Key:      sk-or-v1-your-key-here
   Model:        meta-llama/llama-3.1-8b-instruct:free
   ```
5. Restart OpenClaw

You're now running on free LLaMA 3.1 at zero cost.

---

## Step 3 — Add your resume (2 min)

Create this file on your machine:
```
~/careerpilot/data/resume.json
```

Paste your resume as JSON (same format as quickstart.py — see SETUP.md).
OpenClaw skills will reference this path.

---

## Step 4 — Install the skill files

Copy the skill files from this guide into OpenClaw's skills folder:

**Mac/Linux:** `~/.openclaw/skills/`
**Windows:**   `%APPDATA%\openclaw\skills\`

Create three folders:
```
~/.openclaw/skills/
├── seek_job_hunter/
│   └── SKILL.md
├── linkedin_job_hunter/
│   └── SKILL.md
└── indeed_job_hunter/
    └── SKILL.md
```

Paste the skill content below into each SKILL.md file.

---

## SKILL FILE 1 — Seek Job Hunter

Save as: `~/.openclaw/skills/seek_job_hunter/SKILL.md`

```markdown
# Seek Job Hunter

Searches seek.com.au for jobs matching your keywords and location,
scores each against your resume, tailors application materials for
the best matches, and logs everything to Excel.

## Trigger phrases
- "Find [role] jobs in [location] on Seek"
- "Search Seek for [keywords] in [location]"
- "Run Seek job hunt for [role]"

## Instructions

You are a career assistant. When triggered, follow these steps exactly:

### Step 1 — Open Seek
1. Open a browser and navigate to: https://www.seek.com.au
2. In the "What" field, type: {keywords from user}
3. In the "Where" field, type: {location from user}
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
4. Wait 2 seconds before the next (be polite to Seek's servers)

### Step 4 — Load the resume
Read the file at: ~/careerpilot/data/resume.json
Extract: candidate name, skills list, experience summary

### Step 5 — Score each job
For each job, score the candidate's fit 0-100 based on:
- Skills overlap with job requirements
- Experience relevance
- Location match
Use your judgment honestly. A score below 60 means don't apply.

### Step 6 — Tailor materials for qualifying jobs (score >= 60)
For each job scoring 60 or above:

RESUME TAILORING:
- Load ~/careerpilot/data/resume.json
- Rewrite the summary section (2-3 sentences) to target this specific role at this company
- Reorder experience bullets to surface the most relevant ones first
- Add any missing keywords naturally where they can be honestly inferred
- Never invent experience — only reframe what exists
- Save tailored resume to: ~/careerpilot/output/{company}_{job_title}/resume.json

COVER LETTER:
Write a 3-paragraph cover letter (under 220 words):
- Para 1: Specific hook about {company} and why this role
- Para 2: Two concrete achievements that match the job requirements
- Para 3: Confident close with call to action
- Do not start with "I am excited to apply"
- Save to: ~/careerpilot/output/{company}_{job_title}/cover_letter.txt

JOB DETAILS:
Save to: ~/careerpilot/output/{company}_{job_title}/job_details.txt
Include: URL, score, what to emphasise, missing keywords

### Step 7 — Log to Excel
Open (or create) ~/careerpilot/data/applications.xlsx
Append one row per processed job:
Columns: Date | Company | Title | Source | Score | Salary | Status | URL | Notes
- Set Source = "seek"
- Set Status = "tailored" for qualifying jobs, "skipped" for below threshold

### Step 8 — Report back
Tell the user:
- How many jobs found
- How many qualified (score >= 60)
- List qualifying jobs with scores
- Confirm output folder location

## Configuration required
- Resume file: ~/careerpilot/data/resume.json (must exist before running)
- Output folder: ~/careerpilot/output/ (created automatically)
- Excel log: ~/careerpilot/data/applications.xlsx (created automatically)

## Notes
- This skill does NOT auto-submit applications — materials are saved for you to review and apply manually
- Seek's layout occasionally changes — if step 2 fails, try navigating manually first
- Run once per day maximum to stay within polite scraping limits
```

---

## SKILL FILE 2 — LinkedIn Job Hunter

Save as: `~/.openclaw/skills/linkedin_job_hunter/SKILL.md`

```markdown
# LinkedIn Job Hunter

Searches LinkedIn Jobs for matching roles, scores and tailors
application materials. Uses public job listings only — no login scraping.

## IMPORTANT — LinkedIn safety rules
- Only search public job listings (no login required to see them)
- Do NOT auto-submit LinkedIn Easy Apply without your review
- Do NOT send connection requests automatically
- Do NOT collect recruiter contact information
- This skill generates draft materials — YOU click submit

## Trigger phrases
- "Find [role] jobs on LinkedIn in [location]"
- "Search LinkedIn for [keywords]"
- "LinkedIn job hunt for [role] in [location]"

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

### Step 4 — Load resume and score
Read ~/careerpilot/data/resume.json
Score each job 0-100 for candidate fit.

### Step 5 — Tailor materials for qualifying jobs (score >= 60)
Same as Seek skill — tailor resume and cover letter per job.

Save to: ~/careerpilot/output/linkedin_{company}_{title}/

### Step 6 — Flag Easy Apply jobs
In job_details.txt, add a note:
"EASY APPLY AVAILABLE — you can apply directly on LinkedIn using the tailored materials above"

### Step 7 — Log to Excel
Append to ~/careerpilot/data/applications.xlsx
Set Source = "linkedin"

### Step 8 — Report back
List qualifying jobs. Highlight which ones have Easy Apply for fastest application.

## How to apply after the skill runs
FOR EASY APPLY jobs:
1. Open the job URL from job_details.txt
2. Click "Easy Apply"
3. Paste the cover letter text when prompted
4. Upload your resume (convert resume.json to PDF using any free tool like jsonresume.org)
5. Review all fields and click Submit yourself

FOR regular LinkedIn jobs:
1. Open the job URL
2. Click "Apply" — it opens the company's external site
3. Use your tailored materials

## Notes
- Do not run this skill while logged out — job descriptions are more visible when logged in
- LinkedIn detects very fast automated clicking — the 3-second delay between cards is required
- If LinkedIn shows a CAPTCHA, stop and complete it manually before continuing
```

---

## SKILL FILE 3 — Indeed Job Hunter

Save as: `~/.openclaw/skills/indeed_job_hunter/SKILL.md`

```markdown
# Indeed Job Hunter

Searches Indeed.com.au for matching roles with tailored application materials.

## Trigger phrases
- "Find [role] jobs on Indeed in [location]"
- "Search Indeed for [keywords] in [location]"
- "Indeed job hunt for [role]"

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
- Note "Easily apply" badges — these have a simplified form

### Step 3 — Fetch descriptions
For each job:
1. Click the job card
2. Copy the full description from the right panel
3. Wait 2 seconds before clicking next

### Step 4 — Score and tailor
Read ~/careerpilot/data/resume.json
Score each job. Tailor materials for those scoring >= 60.

Save to: ~/careerpilot/output/indeed_{company}_{title}/

### Step 5 — Log to Excel
Append to ~/careerpilot/data/applications.xlsx
Set Source = "indeed"

### Step 6 — Report back
List qualifying jobs. Note which have "Easily apply".

## How to apply after the skill runs
FOR "Easily apply" jobs:
1. Open the job URL
2. Click "Easily apply" or "Apply now"
3. Fill the form using your tailored resume.json content
4. Paste cover letter text into the cover letter field
5. Submit yourself

## Notes
- Indeed.com.au has a CAPTCHA system — if triggered, complete it manually
- Some Indeed jobs redirect to the company's ATS — have your materials ready
- "Easily apply" jobs typically only need resume + optional cover letter
```

---

## Step 5 — Set up daily automation (HEARTBEAT.md)

OpenClaw can run your job hunt automatically every morning.
Edit: `~/.openclaw/HEARTBEAT.md`

```markdown
# CareerPilot Daily Schedule

## 9:00 AM weekdays
Run the seek_job_hunter skill with keywords "software engineer" and location "Sydney"
Then run linkedin_job_hunter with the same keywords and location
Notify me on Discord when done

## Every Monday 9:00 AM
Run a weekly summary:
- How many jobs found and applied to this week
- Which companies have responded
- What is my current application success rate based on ~/careerpilot/data/applications.xlsx

## Triggers
If I say "run job hunt" at any time: run seek_job_hunter immediately
If I say "LinkedIn hunt": run linkedin_job_hunter immediately
If I say "full hunt": run all three skills (seek, linkedin, indeed) in sequence
```

---

## Step 6 — Set up memory (MEMORY.md)

Edit: `~/.openclaw/MEMORY.md`

```markdown
# CareerPilot User Profile

## Job search preferences
- Target roles: Software Engineer, Full Stack Developer, React Developer, Frontend Engineer
- Target locations: Sydney, Remote
- Minimum match score: 60
- Daily application target: 10-15

## Resume location
~/careerpilot/data/resume.json

## Output folder
~/careerpilot/output/

## Excel tracker
~/careerpilot/data/applications.xlsx

## Application rules
- Always tailor resume summary per job
- Never apply to companies flagged as "avoid" in job_details.txt
- Flag any job over $150k AUD for special attention
- Prefer companies with 50-500 employees (better growth opportunity)

## Application tracking
Update me whenever I tell you "Company X responded" or "I got an interview at Company X"
Mark the relevant row in applications.xlsx and note it in memory
```

---

## How to trigger the skills

In OpenClaw's chat interface (or via Discord/Telegram if connected):

```
"Find React developer jobs in Sydney on Seek"
"Search LinkedIn for full stack engineer jobs remote"
"Run full hunt for software engineer in Melbourne"
"How many jobs did I apply to this week?"
"Mark Atlassian as responded"
```

---

## Limitations vs the full CareerPilot build

| Feature | OpenClaw Phase 1 | Full CareerPilot (NestJS) |
|---|---|---|
| Seek scraping | ✅ Computer Use | ✅ Playwright headless |
| LinkedIn scraping | ✅ Computer Use | ✅ Playwright headless |
| Indeed scraping | ✅ Computer Use | ✅ Playwright |
| Resume tailoring | ✅ LLM via OpenRouter | ✅ LLM + writer agent |
| Cover letters | ✅ LLM | ✅ LLM |
| Excel tracking | ✅ OpenClaw writes file | ✅ exceljs |
| Semantic matching | ❌ basic scoring only | ✅ pgvector embeddings |
| A/B variant testing | ❌ | ✅ |
| Feedback learning loop | ❌ | ✅ |
| Runs headlessly 24/7 | ❌ app must be open | ✅ |
| Home server deployment | ❌ | ✅ |
| Dashboard | ❌ | ✅ Next.js |
| Auto-submit | ⚠️ risky, manual safer | ✅ with approval gate |
| Cost | $0 | $0 |
| Portfolio worthy | ❌ | ✅ |
| Setup time | 20 minutes | 4-6 weeks |

---

## Recommended workflow

Use OpenClaw NOW while building the full system.

Week 1-2: OpenClaw running daily, collecting real job data into applications.xlsx
Week 3-6: Build the NestJS system using AGENT_PROMPTS.md
Week 7: Import your applications.xlsx data into Supabase as seed data
Week 8: Switch to the full system, now with 4-6 weeks of real outcome data already in the feedback loop

You arrive at the full system with a learning advantage — real data from day one.
```
