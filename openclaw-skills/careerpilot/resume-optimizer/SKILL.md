---
name: careerpilot-resume-optimizer
description: "Optimize resume for ATS systems. Improves keyword density, formatting, section structure, and parseability without changing content meaning."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# Resume Optimizer

Optimize resume for ATS systems. Improves keyword density, formatting, section structure, and parseability without changing content meaning.

## Trigger phrases
- "Optimize my resume for ATS"
- "Make my resume ATS-friendly"
- "Fix resume formatting issues"
- "Improve resume keyword density"

## Instructions

### Step 1 — Load resume
1. Determine profile from context (tech or ain)
2. Load resume from: `~/careerpilot/data/profiles/{profile}/resume.md`

### Step 2 — Analyze for ATS issues
Check for:
- Tables (ATS can't parse them)
- Headers/footers with content
- Images or graphics
- Complex formatting (columns, text boxes)
- Non-standard fonts
- Inconsistent date formats
- Missing standard section headers

### Step 3 — Optimize keyword density
Target: 2-3% keyword density for target keywords

**Process:**
1. Identify target keywords from preferences.md
2. Count current keyword occurrences
3. Calculate current density
4. Suggest additions where density is too low
5. Never force keywords — integrate naturally

### Step 4 — Optimize section structure
Ensure standard sections in this order:
1. Contact Information
2. Professional Summary (2-3 sentences)
3. Experience / Work History
4. Education
5. Skills
6. Projects (optional)
7. Certifications (if relevant)

### Step 5 — Optimize bullet points
For each experience bullet:
- Start with strong action verb
- Include quantified achievement where possible
- Keep under 2 lines
- Focus on impact, not duties

### Step 6 — Generate optimized resume
Output optimized resume with:
- ATS-friendly formatting
- Improved keyword density
- Standard section headers
- Optimized bullet points
- Change log documenting what was improved

### Step 7 — Save optimized resume
Save to: `~/careerpilot/output/{profile}/resume_optimized/{date}_resume_optimized.md`

## Configuration
- Profile: auto-detected or specified
- Resume: `~/careerpilot/data/profiles/{profile}/resume.md`
- ATS rules: `{baseDir}/references/ats-rules.md`

## Notes
- Never invent experience — only reframe what exists
- Preserve all original information
- Document all changes in change log
- Test with ATS simulator if available
