---
name: careerpilot-resume-scorer
description: "Score resume against job description (0-100). Identifies keyword gaps, ATS compatibility issues, and provides actionable improvement suggestions. Profile-aware scoring."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# Resume Scorer

Score resume against job description (0-100). Identifies keyword gaps, ATS compatibility issues, and provides actionable improvement suggestions.

## Trigger phrases
- "Score my resume against this job"
- "Check ATS compatibility for this role"
- "What keywords am I missing for this job?"
- "Analyze resume fit for [job title]"

## Instructions

### Step 1 — Load resume
1. Determine profile from context (tech or ain)
2. Load resume from: `~/careerpilot/data/profiles/{profile}/resume.md`
3. Parse into sections: summary, experience, education, skills, projects

### Step 2 — Get job description
Accept job description from:
- Pasted text
- URL (fetch and extract)
- File path (read file)

### Step 3 — Extract keywords from job
Identify:
- **Required skills**: Explicitly listed as requirements
- **Preferred skills**: Listed as "nice to have" or "preferred"
- **Experience requirements**: Years of experience, seniority level
- **Industry keywords**: Specific to the role/industry
- **Soft skills**: Communication, teamwork, leadership, etc.

### Step 4 — Score across 5 dimensions

#### 4.1 Keyword Match (40 points)
- Count exact keyword matches
- Count semantic matches (synonyms, related terms)
- Calculate overlap percentage
- Score: (match_percentage × 40)

#### 4.2 Experience Relevance (25 points)
- Years of experience vs requirement
- Industry match
- Seniority level match
- Role similarity
- Score based on alignment

#### 4.3 Skills Match (20 points)
- Required skills present
- Preferred skills present
- Technical depth
- Score based on coverage

#### 4.4 Format/ATS (10 points)
- Standard section headers (Experience, Education, Skills)
- No tables, images, or complex formatting
- Parseable date formats
- Contact information present
- Deduct for ATS issues

#### 4.5 Location Fit (5 points)
- Same city: 5 points
- Commutable: 3-4 points
- Requires relocation: 1-2 points
- International: 0 points

### Step 5 — Generate report

Output format:
```
## Resume Score: {total}/100

### Breakdown
- Keyword Match: {score}/40 ({percentage}%)
- Experience Relevance: {score}/25
- Skills Match: {score}/20
- Format/ATS: {score}/10
- Location Fit: {score}/5

### Missing Keywords
**Critical (required but missing):**
- [keyword 1]
- [keyword 2]

**Recommended (preferred but missing):**
- [keyword 3]
- [keyword 4]

### ATS Issues
- [issue 1]
- [issue 2]

### Improvement Suggestions
1. [specific action]
2. [specific action]
3. [specific action]

### Verdict
{score interpretation from scoring-rubric.md}
```

### Step 6 — Save report
Save to: `~/careerpilot/output/{profile}/resume_scores/{date}_{company}_score.md`

## Configuration
- Profile: auto-detected or specified
- Resume: `~/careerpilot/data/profiles/{profile}/resume.md`
- Scoring rubric: `{baseDir}/references/scoring-framework.md`

## Notes
- Use LLM for semantic keyword matching (not just exact matches)
- Consider context: "React" in tech vs "react" in chemistry
- Be honest about gaps — false positives waste application effort
- Suggest specific, actionable improvements
