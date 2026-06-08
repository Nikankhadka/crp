---
name: careerpilot-feedback-loop
description: "Analyze application outcomes and adjust strategy. Identifies best sources, score bands, and variants. Generates weekly strategy notes for the coordinator."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# Feedback Loop

Analyze application outcomes and adjust strategy. Identifies best sources, score bands, and variants. Generates weekly strategy notes for the coordinator.

## Trigger phrases
- "Analyze application outcomes"
- "Generate strategy for next run"
- "What's working in my job search?"
- "Adjust strategy based on results"

## Instructions

### Step 1 — Query application tracker
Load data from: `~/careerpilot/data/applications.xlsx`

Filter for applications with status:
- applied
- responded
- interview
- rejected
- ghosted

Exclude: found, scored, pending_approval (not yet submitted)

### Step 2 — Analyze by source
For each source (seek, linkedin, indeed, jora, provider):
- Count total applications
- Count responses (responded + interview)
- Calculate response rate: (responses / total) × 100

Identify: **best_source** (highest response rate)

### Step 3 — Analyze by score band
Group applications by match score:
- 85+ (excellent)
- 70-84 (good)
- 60-69 (minimum threshold)
- Below 60 (stretch)

For each band:
- Count total applications
- Count responses
- Calculate response rate

Identify: **best_score_band** (highest response rate)

### Step 4 — Analyze by variant
For each variant (A, B):
- Count total applications
- Count responses
- Calculate response rate

Identify: **best_variant** (highest response rate)

If insufficient data (< 5 applications per variant): set to "insufficient_data"

### Step 5 — Identify avoid patterns
Look for patterns in rejected/ghosted applications:
- Sources with < 5% response rate
- Score bands with < 5% response rate
- Companies that rejected multiple times
- Keywords that appear in rejected jobs

Generate: **avoid_patterns[]** (list of patterns to avoid)

### Step 6 — Generate strategy note
Use LLM to synthesize findings into actionable strategy:

```
Analyse these job application outcomes and identify patterns:
{outcomeStatsJson}

Return JSON:
{
  "best_source": "seek|linkedin|indeed|jora|provider",
  "best_score_band": "85+|70-84|below-70",
  "best_variant": "A|B|insufficient_data",
  "avoid_patterns": ["any patterns to deprioritise"],
  "strategy_note": "one sentence recommendation for today's run"
}
Return { "best_source": "seek", "best_score_band": "70-84", "best_variant": "A", "avoid_patterns": [], "strategy_note": "No data yet, run normally." } if no data exists.
```

### Step 7 — Adjust coordinator behavior

**Adjust Scout priority:**
- If best_source is known: run that source first
- Increase maxResults for best_source by 50%

**Adjust Writer variant selection:**
- If best_variant is A or B (not insufficient_data):
  - Use that variant for 70% of applications
  - Alternate for remaining 30%

**Adjust Analyst threshold:**
- If best_score_band is "85+": consider raising min_match_score to 75
- If best_score_band is "70-84": keep min_match_score at 65-70
- If best_score_band is "below-70": lower min_match_score to 60

### Step 8 — Log strategy
Save strategy to: `~/careerpilot/output/{profile}/strategy/{date}_strategy.json`

Post strategy note to Discord/Telegram:
```
📋 Today's Strategy

Best Source: Seek (25% response rate)
Best Score Band: 70-84 (30% response rate)
Best Variant: B (35% vs 15% for A)

Strategy: Focus on Seek jobs scoring 70-84, use Variant B for 70% of applications.
```

## Configuration
- Tracker: `~/careerpilot/data/applications.xlsx`
- Analysis: `{baseDir}/references/outcome-analysis.md`

## Notes
- Run feedback loop weekly or after 10+ applications
- Need minimum 5 applications per category for reliable stats
- Strategy adjusts automatically on next run
- Log all strategy changes for debugging
