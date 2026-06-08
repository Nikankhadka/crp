---
name: careerpilot-interview-prep
description: "Prepare for job interviews. Generates role-specific questions, STAR method coaching, company research brief, and mock interview practice."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# Interview Prep

Prepare for job interviews. Generates role-specific questions, STAR method coaching, company research brief, and mock interview practice.

## Trigger phrases
- "Prepare me for interview at [company]"
- "Generate interview questions for [role]"
- "Mock interview practice"
- "Help me prepare for this interview"

## Instructions

### Step 1 — Load profile and resume
1. Determine profile from context (tech or ain)
2. Load resume from: `~/careerpilot/data/profiles/{profile}/resume.md`

### Step 2 — Get job details
Accept from user:
- Company name
- Job title
- Job description (pasted or URL)

### Step 3 — Research company
Use company-research skill to generate:
- Company overview
- Recent news
- Tech stack (for tech roles)
- Culture signals
- Red flags (if any)

### Step 4 — Generate interview questions

**Behavioral Questions (3 questions):**
- "Tell me about a time when..."
- "Describe a situation where..."
- "Give me an example of..."

Focus on:
- Teamwork
- Problem-solving
- Leadership
- Handling conflict
- Adapting to change

**Technical/Role-Specific Questions (4 questions):**
For tech roles:
- System design
- Coding challenges
- Architecture decisions
- Debugging scenarios

For AIN roles:
- Care scenarios
- Handling difficult situations
- Medication administration
- Person-centred care examples

**Situational Questions (3 questions):**
- "What would you do if..."
- "How would you handle..."
- "If you were faced with..."

### Step 5 — Generate STAR responses
For each behavioral question:
1. Identify relevant experience from resume
2. Write STAR response:
   - Situation: 20-30 words
   - Task: 20-30 words
   - Action: 60-80 words
   - Result: 40-60 words
3. Quantify results where possible
4. Tailor to the specific role

### Step 6 — Generate "Tell me about yourself" script
60-second script covering:
- Current role/status
- Key achievements (2-3)
- Why this role
- What you bring

### Step 7 — Prepare questions to ask interviewer
Generate 5 thoughtful questions:
- About the role
- About the team
- About company culture
- About growth opportunities
- About next steps

### Step 8 — Save prep document
Save to: `~/careerpilot/output/{profile}/interview_prep/{date}_{company}_prep.md`

Format:
```
# Interview Prep: [Company] - [Role]

## Company Research
[company research summary]

## Likely Questions

### Behavioral
1. [question]
   **Suggested STAR Response:**
   [response]

2. [question]
   [response]

3. [question]
   [response]

### Technical/Role-Specific
1. [question]
   [answer/talking points]

[continue...]

### Situational
1. [question]
   [answer]

[continue...]

## "Tell Me About Yourself" Script
[60-second script]

## Questions to Ask
1. [question]
2. [question]
3. [question]
4. [question]
5. [question]

## Day-Of Checklist
- [ ] Research company website
- [ ] Review job description
- [ ] Prepare outfit
- [ ] Test technology (if virtual)
- [ ] Have questions ready
- [ ] Bring resume copies (if in-person)
```

## Configuration
- Profile: auto-detected or specified
- Resume: `~/careerpilot/data/profiles/{profile}/resume.md`
- STAR guide: `{baseDir}/references/star-method.md`

## Notes
- Tailor questions to the specific role and company
- Use resume examples for STAR responses
- Practice aloud before interview
- Keep answers concise (2 minutes max per question)
