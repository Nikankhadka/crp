---
name: careerpilot-linkedin-optimizer
description: "Audit and optimize LinkedIn profile. Scores each section, rewrites headline and About, optimizes for AI search visibility (ChatGPT, Perplexity)."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# LinkedIn Optimizer

Audit and optimize LinkedIn profile. Scores each section, rewrites headline and About, optimizes for AI search visibility (ChatGPT, Perplexity).

## Trigger phrases
- "Optimize my LinkedIn profile"
- "Audit my LinkedIn"
- "Rewrite my LinkedIn headline"
- "Make my LinkedIn profile better"

## Instructions

### Step 1 — Get LinkedIn content
Accept from user:
- Current headline
- About section
- Top 2-3 experience entries
- Skills list
- Target audience (recruiters, clients, etc.)
- Goal (job search, networking, thought leadership)

### Step 2 — Score each section (1-10)

**Headline:**
- 1-3: Generic ("Software Engineer at Company")
- 4-6: Some specificity but no differentiation
- 7-8: Clear value proposition, keywords
- 9-10: Outcome-focused, niche-specific, searchable

**About Section:**
- 1-3: Empty or generic summary
- 4-6: Career history but no hook
- 7-8: Good story, some achievements
- 9-10: Compelling hook, proof points, clear CTA

**Experience:**
- 1-3: Duty descriptions, no metrics
- 4-6: Some achievements but not quantified
- 7-8: Good achievements, some metrics
- 9-10: Quantified impact, action verbs, results-first

**Skills:**
- 1-3: Few skills, not relevant
- 4-6: Relevant but not optimized
- 7-8: Good coverage, some keywords
- 9-10: Fully optimized for target roles

### Step 3 — Generate headline variants

**Variant A: Authority-Forward**
"[Title] | [Specialization] | [Key Achievement]"
Example: "Senior Full Stack Engineer | React & Node.js | Built SaaS serving 50K+ users"

**Variant B: Outcome-Forward**
"I help [audience] achieve [outcome] through [method]"
Example: "I help startups ship scalable web apps using React, Node.js, and cloud-native architecture"

**Variant C: Niche-Specific**
"[Niche] [Title] specializing in [specific skill] for [specific industry]"
Example: "AI-Enabled Full Stack Developer specializing in Azure OpenAI workflows for SaaS platforms"

### Step 4 — Rewrite About section
Structure:
1. **Hook** (1-2 sentences): Grab attention, state what makes you different
2. **Credibility Block** (2-3 sentences): Key achievements with numbers
3. **Proof** (2-3 sentences): Specific examples, technologies
4. **CTA** (1 sentence): What you want, how to reach you

Rules:
- Under 220 words
- No buzzwords ("passionate", "synergy", "guru")
- First-person, conversational
- Include keywords for searchability

### Step 5 — Optimize experience bullets
For each entry:
- Start with action verb
- Lead with result/impact
- Include metrics where possible
- Keep under 2 lines per bullet
- 3-5 bullets per role

### Step 6 — Run AI visibility checklist (8 points)
1. Headline contains target role keywords
2. About section includes niche/specialization
3. Experience entries have quantified achievements
4. Skills section has 15+ relevant skills
5. Profile has professional photo
6. Custom URL (linkedin.com/in/yourname)
7. Recommendations present (2+)
8. Active posting/engagement

Score: X/8 with top 3 improvements

### Step 7 — Save optimization report
Save to: `~/careerpilot/output/{profile}/linkedin/{date}_linkedin_optimization.md`

## Notes
- Focus on searchability — recruiters search by keywords
- Quantify everything possible
- Remove buzzwords, replace with specifics
- Update regularly (monthly review)
