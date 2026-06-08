---
name: careerpilot-selection-criteria
description: "Respond to selection criteria for Australian job applications. STAR method responses for each criterion, tailored to the specific role and organization."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# Selection Criteria Writer

Respond to selection criteria for Australian job applications. STAR method responses for each criterion, tailored to the specific role and organization.

## Trigger phrases
- "Write selection criteria responses"
- "Respond to these selection criteria"
- "Draft selection criteria for this job"

## Instructions

### Step 1 — Load profile and resume
1. Determine profile from context (tech or ain)
2. Load resume from: `~/careerpilot/data/profiles/{profile}/resume.md`

### Step 2 — Get selection criteria
Accept selection criteria from:
- Pasted text
- URL (fetch and extract)
- File path (read file)

Parse into individual criteria.

### Step 3 — For each criterion, write STAR response

**STAR Method:**

**Situation (20-30 words)**
- Set the context
- Where were you working?
- What was the situation?

**Task (20-30 words)**
- What was your responsibility?
- What needed to be done?
- What was the goal?

**Action (60-80 words)**
- What specific actions did YOU take?
- Use "I" not "we"
- Be specific about your contribution
- Show your skills in action

**Result (40-60 words)**
- What was the outcome?
- Quantify if possible (%, $, time saved)
- What did you learn?
- How did it benefit the organization?

### Step 4 — Tailor to role and organization
- Reference the specific organization where relevant
- Align responses with role requirements
- Use keywords from the job description
- Show understanding of the industry

### Step 5 — Review each response
- Word count: 150-250 words per criterion
- Clear STAR structure
- Specific examples from resume
- Quantified results where possible
- Professional tone

### Step 6 — Save responses
Save to: `~/careerpilot/output/{profile}/{date}_{company}_{slug}/selection_criteria.md`

Format:
```
# Selection Criteria Responses

## Criterion 1: [criterion text]

[STAR response]

---

## Criterion 2: [criterion text]

[STAR response]
```

## Configuration
- Profile: auto-detected or specified
- Resume: `~/careerpilot/data/profiles/{profile}/resume.md`
- STAR guide: `{baseDir}/references/star-method.md`

## Notes
- Each response should be 150-250 words
- Use specific examples, not generalizations
- Focus on YOUR actions, not team actions
- Quantify results where possible
- Tailor to the specific organization
