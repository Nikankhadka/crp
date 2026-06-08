# Folder Structure

Conventions for where files go and how they're named.

## Root

```
cpilot/
├── README.md                    # Top-level orientation + quickstart
├── AGENTS.md                    # Build workflow (existing)
├── AGENT_PROMPTS.md             # v1 build prompts (existing, untouched)
├── AGENT_PROMPTS_v2.md          # v2 build prompts (revised for MD resume, 2 profiles, guardrails)
├── OPENCLAW_PHASE1.md           # OpenClaw setup guide (existing)
├── .env.example                 # Environment variable template
├── .gitignore                   # Git ignore rules
```

## docs/

Design and decision records. Concise unless noted.

```
docs/
├── VIABILITY.md                 # THOROUGH — risk analysis, auto-apply realism
├── DECISIONS.md                 # THOROUGH — all design decisions with rationale
├── PROFILES.md                  # Two-profile model explained
├── ARCHITECTURE.md              # System diagram, agent flow, data model
├── ROADMAP.md                   # Phased build plan with milestones
├── FOLDER_STRUCTURE.md          # This file
└── AGENT_PROMPTS_v2.md          # Revised 16-step build prompts
```

## openclaw-skills/

OpenClaw skill files for Phase 1. Copy to `~/.openclaw/skills/` after setup.

```
openclaw-skills/
├── common/SKILL.md              # Shared: load profile, use guardrails, write to output/
├── tech_seek_hunter/SKILL.md
├── tech_linkedin_hunter/SKILL.md
├── tech_indeed_hunter/SKILL.md
├── ain_seek_hunter/SKILL.md
├── ain_indeed_hunter/SKILL.md
├── ain_jora_hunter/SKILL.md
└── ain_provider_careers_hunter/SKILL.md
```

## data/

User-specific inputs and run outputs. Gitignored.

```
data/
├── profiles/
│   ├── tech/
│   │   ├── resume.md            # Base resume (Markdown)
│   │   ├── cover_letter.md      # Base cover letter template
│   │   └── preferences.md       # Target roles, locations, scoring, tone, blacklist
│   └── ain/
│       ├── resume.md
│       ├── cover_letter.md
│       └── preferences.md
├── shared/
│   └── blacklist.md             # Companies to avoid (applies to all profiles)
└── applications/                # Per-run output (grouped by profile)
    ├── tech/2026-06-06_run-001/
    │   ├── jobs_found.json
    │   ├── scored.json
    │   └── approved.json
    └── ain/2026-06-06_run-001/
```

## output/

Tailored application materials. Gitignored.

```
output/
├── tech/
│   └── {date}_{company}_{slug}/
│       ├── job_details.md
│       ├── resume_tailored.md
│       ├── cover_letter.txt
│       └── scout_notes.md
└── ain/
    └── {date}_{company}_{slug}/
```

## traces/

LLM call debug logs (JSON). Gitignored.

```
traces/
└── {job_id}_{agent}_{timestamp}.json
```

## logs/

Run logs. Gitignored.

```
logs/
└── {date}_run.log
```

## src/

NestJS source code (Phase 2).

```
src/
├── agents/                      # Coordinator, Analyst, Writer, Scout
├── intelligence/                # LLM, embeddings, company-score, salary
├── scrapers/
│   ├── base-scraper.service.ts  # Shared: UA rotation, jitter, retry
│   ├── tech/                    # Seek, LinkedIn, Indeed
│   └── ain/                     # Seek Health, Indeed, Jora, provider careers
├── executor/                    # Auto-apply
│   ├── guardrails/              # 8 guards (cap, cooldown, captcha, blacklist, etc.)
│   └── forms/                   # Per-ATS handlers
├── tracking/
│   ├── database.service.ts      # Supabase
│   ├── excel.service.ts         # Excel tracker
│   └── profile.service.ts       # Loads correct profile
├── discord/                     # Bot + slash commands
├── scheduler/                   # Cron jobs
├── common/                      # Models, config
├── app.module.ts
└── main.ts
```

## dashboard/

Next.js dashboard (Phase 2).

```
dashboard/
├── app/
│   ├── page.tsx                 # Main dashboard
│   └── traces/[jobId]/page.tsx  # Trace viewer
├── components/
│   └── StatusBadge.tsx
└── ...
```

## Naming conventions

- **Folders**: lowercase, hyphens for multi-word (`tech_seek_hunter`, `provider-careers`)
- **Files**: lowercase, hyphens for multi-word (`resume_tailored.md`, `cover_letter.txt`)
- **Classes**: PascalCase (`SeekService`, `AnalystService`)
- **Methods**: camelCase (`scrapeJobs`, `tailorResume`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_DAILY_APPLICATIONS`)

## Gitignore rules

- `.env` (secrets)
- `data/` (user-specific)
- `output/` (generated materials)
- `traces/` (debug logs)
- `logs/` (run logs)
- `node_modules/` (dependencies)
- `dist/`, `build/`, `.next/` (build output)
