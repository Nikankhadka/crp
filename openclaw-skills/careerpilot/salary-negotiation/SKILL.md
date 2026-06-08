---
name: careerpilot-salary-negotiation
description: "Research salary ranges and prepare negotiation strategies. Uses Australian salary data sources. Provides scripts for counter-offers and negotiation."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# Salary Negotiation

Research salary ranges and prepare negotiation strategies. Uses Australian salary data sources. Provides scripts for counter-offers and negotiation.

## Trigger phrases
- "What should I ask for this role?"
- "Research salary for [role] in [location]"
- "Help me negotiate my offer"
- "Is this salary fair?"

## Instructions

### Step 1 — Get role details
Collect from user:
- Job title
- Location
- Years of experience
- Current salary (optional)
- Offer received (if applicable)

### Step 2 — Research salary ranges
Search Australian salary sources:
- Glassdoor Australia
- Seek Salary Tool
- Hays Salary Guide
- Robert Half Salary Guide
- Levels.fyi (for tech)
- PayScale Australia

For each source, find:
- Base salary range
- Superannuation (11% in Australia)
- Total compensation (base + super + bonuses)

### Step 3 — Calculate recommended range
Based on research:
- **Low end**: 10th percentile (minimum acceptable)
- **Mid point**: 50th percentile (market rate)
- **High end**: 75th percentile (aspirational)
- **Stretch**: 90th percentile (top of market)

Factor in:
- Experience level
- Location (Sydney premium vs regional)
- Company size (startup vs enterprise)
- Industry (tech premium vs non-tech)

### Step 4 — Generate negotiation scripts

**Initial Ask (when asked "what are your salary expectations"):**
```
"Based on my research and experience, I'm looking for a base salary in the range of $X-$Y plus super. I'm flexible depending on the total package including benefits and growth opportunities."
```

**Counter-Offer (when offer is below range):**
```
"Thank you for the offer. I'm excited about the role and the team. Based on my research of similar roles in [location] and my experience with [specific skills], I was expecting something closer to $X. Is there room to move on the base salary?"
```

**Handling "What's your current salary":**
```
"I'd prefer to focus on the value I can bring to this role rather than my current compensation. Based on my research and the responsibilities of this position, I'm targeting $X-$Y."
```

**Accepting an Offer:**
```
"Thank you, I'm delighted to accept. Could you confirm the full package in writing including base, super, any bonuses, and benefits? I look forward to starting on [date]."
```

### Step 5 — Prepare negotiation checklist
- [ ] Research completed for 3+ sources
- [ ] Know your walk-away number
- [ ] Have specific achievements ready to justify ask
- [ ] Practice negotiation script aloud
- [ ] Prepare responses to common pushback
- [ ] Know total package components (leave, flexible work, etc.)

### Step 6 — Save negotiation prep
Save to: `~/careerpilot/output/{profile}/salary_negotiation/{date}_{company}_negotiation.md`

## Notes
- Australian salaries are quoted as base + super (11%)
- Always negotiate — first offer is rarely best offer
- Focus on total package, not just base
- Be prepared to walk away if below minimum
