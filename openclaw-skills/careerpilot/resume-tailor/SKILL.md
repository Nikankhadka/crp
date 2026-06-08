---
name: careerpilot-resume-tailor
description: "Tailor resume for specific job. Rewrites summary, reorders bullets, incorporates missing keywords. Variant A (technical depth) and Variant B (outcomes) support."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# Resume Tailor

Tailor resume for specific job. Rewrites summary, reorders bullets, incorporates missing keywords. Variant A (technical depth) and Variant B (outcomes) support.

## Trigger phrases
- "Tailor my resume for this job"
- "Customize resume for [company] role"
- "Create tailored resume variants"

## Instructions

### Step 1 — Load master resume
1. Determine profile from context (tech or ain)
2. Load resume from: `~/careerpilot/data/profiles/{profile}/resume.md`

### Step 2 — Analyze job requirements
Accept job description from:
- Pasted text
- URL (fetch and extract)
- File path (read file)

Extract:
- Required skills and keywords
- Experience requirements
- Role responsibilities
- Company culture signals

### Step 3 — Generate Variant A (Technical Depth)
**Strategy:** Lead with technical depth, reorder bullets to surface senior/complex work first

1. Rewrite summary to lead with years of experience and tech stack depth
2. Reorder experience bullets within each role:
   - Most technically complex work first
   - Architecture/design decisions
   - Technical leadership
   - Then implementation details
3. Incorporate missing keywords naturally
4. Emphasize technical achievements

### Step 4 — Generate Variant B (Outcomes)
**Strategy:** Lead with shipped products and outcomes, surface impact metrics first

1. Rewrite summary to lead with what you've built and delivered
2. Reorder experience bullets within each role:
   - Quantified achievements first
   - Business impact
   - Products shipped
   - Then technical details
3. Incorporate missing keywords naturally
4. Emphasize measurable outcomes

### Step 5 — Save variants
Save to:
- `~/careerpilot/output/{profile}/{date}_{company}_{slug}/resume_variant_A.md`
- `~/careerpilot/output/{profile}/{date}_{company}_{slug}/resume_variant_B.md`

Include change log in each file documenting what was tailored.

## Configuration
- Profile: auto-detected or specified
- Resume: `~/careerpilot/data/profiles/{profile}/resume.md`
- Tone guides: `{baseDir}/references/tech-tone-guide.md` or `ain-tone-guide.md`

## Notes
- Never invent experience — only reframe what exists
- Both variants should use the same base content, just reordered and emphasized differently
- Incorporate missing keywords where honestly applicable
- Document all changes
