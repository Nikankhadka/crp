# CareerPilot

Automated job discovery, scoring, resume tailoring, and application pipeline for two profiles: **Tech** (Software Engineer) and **AIN** (Assistant in Nursing / Aged Care).

## How it works

1. **Discover** — Scrapers find jobs on Seek, LinkedIn, Indeed, Jora, and aged care provider career sites
2. **Score** — LLM scores each job against the profile's resume (0-100)
3. **Tailor** — Resume and cover letter are rewritten per job, emphasising relevant experience
4. **Apply** — Auto-submit with strict guardrails (rate limits, captcha detection, human approval gates)
5. **Track** — Every application logged to Supabase + Excel, with outcome feedback loop

## Two profiles

| Profile | Target roles | Sources | Auto-apply |
|---|---|---|---|
| `tech` | Software Engineer, Full Stack, React, Frontend | Seek + LinkedIn + Indeed | Strict guardrails |
| `ain` | Assistant in Nursing, Aged Care, Disability Support | Seek Health + Indeed + Jora + provider careers | Full auto + guardrails |

## Quickstart

### Phase 1: OpenClaw (20 min setup, value today)

1. Install OpenClaw: `npm install -g openclaw && openclaw start`
2. Configure OpenRouter free key in OpenClaw settings
3. Copy skill files: `cp -r openclaw-skills/* ~/.openclaw/skills/`
4. Drop your resume/cover letter into `data/profiles/{tech,ain}/`
5. Edit `data/profiles/{tech,ain}/preferences.md` with your targets
6. In OpenClaw chat: "Find software engineer jobs in Sydney on Seek"

### Phase 2: NestJS (full build, 2-4 weeks)

```bash
cp .env.example .env
# Fill in .env with your keys
npm install
npm run start:dev
```

See `docs/ROADMAP.md` for the full phased build plan.

## Folder structure

```
data/profiles/{tech,ain}/   — your resume, cover letter, preferences
output/{tech,ain}/          — tailored application materials per job
traces/                     — LLM call debug logs
logs/                       — run logs
src/                        — NestJS source (Phase 2)
openclaw-skills/            — OpenClaw skill files (Phase 1)
docs/                       — architecture, viability analysis, roadmap
```

See `docs/FOLDER_STRUCTURE.md` for full conventions.

## Key commands

```bash
npm run start:dev           # NestJS dev server (port 3001)
npm run test                # Jest tests
npm run run-once -- --profile=tech   # Manual pipeline run
npm run run-once -- --profile=ain    # Manual pipeline run
```

## Discord commands

```
/run-tech [keywords] [location]   — Run tech pipeline
/run-ain [keywords] [location]    — Run AIN pipeline
/status                           — Outcome stats per profile
/jobs                             — Pending approvals
/report                           — Attach Excel tracker
/responded [company]              — Mark as responded
/strategy                         — Current strategy per profile
```

## Docs

- `docs/VIABILITY.md` — Honest risk analysis (auto-apply, bans, quality)
- `docs/DECISIONS.md` — All design decisions with rationale
- `docs/PROFILES.md` — Two-profile model explained
- `docs/ARCHITECTURE.md` — System diagram and agent flow
- `docs/ROADMAP.md` — Phased build plan with milestones
- `docs/FOLDER_STRUCTURE.md` — File conventions
- `docs/AGENT_PROMPTS_v2.md` — Revised 16-step build prompts
# crp
