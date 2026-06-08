---
name: careerpilot-cover-letter-writer
description: "Write tailored cover letters for job applications. 3 paragraphs, under 220 words. Profile-aware tone (tech=confident, AIN=compassionate). No cliché openers."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# Cover Letter Writer

Write tailored cover letters for job applications. 3 paragraphs, under 220 words. Profile-aware tone (tech=confident, AIN=compassionate). No cliché openers.

## Trigger phrases
- "Write cover letter for this job"
- "Create cover letter for [company] role"
- "Draft cover letter"

## Instructions

### Step 1 — Load profile and resume
1. Determine profile from context (tech or ain)
2. Load resume from: `~/careerpilot/data/profiles/{profile}/resume.md`
3. Load base cover letter from: `~/careerpilot/data/profiles/{profile}/cover_letter.md`
4. Load preferences for tone guidance

### Step 2 — Analyze job description
Accept job description from:
- Pasted text
- URL (fetch and extract)
- File path (read file)

Extract:
- Company name and specifics
- Role requirements
- Key responsibilities
- Culture signals

### Step 3 — Write cover letter

**Structure:**

**Paragraph 1: Hook (50-70 words)**
- One sentence referencing something specific about the company
- Why this role at this company
- No generic openers like "I am excited to apply"

**Paragraph 2: Achievements (80-100 words)**
- Two concrete achievements from resume
- Directly address the role's needs
- Include quantified results where possible
- Use profile-appropriate tone

**Paragraph 3: Close (40-60 words)**
- Confident close
- Call to action
- No begging or desperation
- Professional sign-off

### Step 4 — Apply tone rules

**Tech Profile Tone:**
- Confident, technical, metrics-driven
- Sound like a senior engineer, not a job applicant
- Use specific numbers and outcomes
- Avoid: "passionate", "excited to apply", "I believe", "I feel"

**AIN Profile Tone:**
- Compassionate, person-centred, care-focused
- Emphasize empathy, patience, commitment to quality of life
- Use specific care examples
- Avoid: generic care phrases, "I love helping people"

### Step 5 — Review and refine
- Check word count (must be under 220 words)
- Verify no cliché openers
- Ensure profile-appropriate tone
- Check for specific company references
- Confirm quantified achievements included

### Step 6 — Save cover letter
Save to: `~/careerpilot/output/{profile}/{date}_{company}_{slug}/cover_letter.txt`

## Configuration
- Profile: auto-detected or specified
- Resume: `~/careerpilot/data/profiles/{profile}/resume.md`
- Structure guide: `{baseDir}/references/structure-guide.md`

## Notes
- Never start with "I am excited/thrilled/pleased to apply"
- No filler: "I believe", "I feel", "I am passionate about"
- Confident and specific
- Plain text only, no markdown formatting
