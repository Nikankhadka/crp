---
name: careerpilot-company-research
description: "Research companies before applying or interviewing. Aggregates news, tech stack, culture signals, funding, and red flags from multiple sources."
---

# Company Research

Research companies before applying or interviewing. Aggregates news, tech stack, culture signals, funding, and red flags from multiple sources.

## Trigger phrases
- "Research [company] for me"
- "Tell me about [company]"
- "What do you know about [company]?"
- "Research this employer"

## Instructions

### Step 1 — Accept company name
Get company name from user. Optionally get industry/sector context.

### Step 2 — Search for information
Search for:

**Company Overview:**
- What does the company do?
- Size (employees)
- Location(s)
- Founded year
- Industry/sector

**Recent News (last 6 months):**
- Funding rounds
- Product launches
- Partnerships
- Leadership changes
- Expansion news

**Tech Stack (for tech roles):**
- Languages, frameworks, databases
- Infrastructure (cloud, CI/CD)
- Engineering culture signals
- Check: Stack Overflow, GitHub, engineering blogs

**Culture Signals:**
- Glassdoor/Indeed reviews summary
- Employee testimonials
- Work-life balance ratings
- Diversity initiatives

**Financial Health:**
- Revenue (if public)
- Funding stage (if startup)
- Growth trajectory
- Layoff history

**Red Flags:**
- Recent layoffs
- Lawsuits
- High turnover signals
- Poor review trends
- News about issues

### Step 3 — Compile research brief

Format:
```
# Company Research: [Company]

## Overview
[2-3 sentence summary]

## Key Facts
- Size: [employee count]
- Founded: [year]
- HQ: [location]
- Industry: [sector]

## Recent News
- [news item 1]
- [news item 2]
- [news item 3]

## Tech Stack (if applicable)
- [tech 1]
- [tech 2]

## Culture
- Glassdoor rating: [X/5] ([N] reviews)
- Work-life balance: [rating]
- Key themes from reviews: [themes]

## Financial Health
- [funding/revenue info]
- [growth trajectory]

## Red Flags
- [flag 1] or "None identified"

## Verdict
[1-2 sentence assessment: good place to work or concerns]
```

### Step 4 — Save research
Save to: `~/careerpilot/output/{profile}/company_research/{date}_{company}_research.md`

## Notes
- Use web search for current information
- Cross-reference multiple sources
- Be honest about red flags
- Note when information is unavailable
