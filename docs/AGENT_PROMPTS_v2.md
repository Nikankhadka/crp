# Agent Prompts v2

Revised 16-step build plan. Updates from v1:
- Markdown resumes (not JSON)
- Two profiles (Tech + AIN)
- Multi-market scrapers (Seek + LinkedIn + Indeed + Jora + provider careers)
- Auto-apply with strict guardrails
- Profile-aware agents

---

## Prompt 01 — Project scaffold + environment

Create a new NestJS TypeScript project called "careerpilot":

1. Scaffold: `nest new careerpilot --package-manager npm --language TypeScript`

2. Install dependencies:
```bash
npm install @supabase/supabase-js @nestjs/schedule @nestjs/config
npm install discord.js playwright exceljs bull @bull-board/nestjs
npm install class-validator class-transformer dotenv
npm install @types/node axios
npm install --save-dev @types/bull
```

3. Create folder structure (see `docs/FOLDER_STRUCTURE.md`).

4. Create `.env` from `.env.example`.

5. Create `data/profiles/tech/resume.md` and `data/profiles/ain/resume.md` (user provides content).

**Done when**: `npm run start:dev` runs without errors.

---

## Prompt 02 — Core data models

Create `src/common/models.ts` with TypeScript interfaces:

- `ApplicationStatus` enum (found, scored, tailored, pending_approval, applied, manual_required, responded, interview, rejected, ghosted)
- `Job` interface (id, title, company, location, url, source, description, salary_text, posted_date, scraped_at)
- `ScoredJob` interface (job, match_score, missing_keywords, strengths, reasoning, recommended_angle)
- `Application` interface (id, profile, job, scored, resume_version, cover_letter, status, applied_at, response_received, trace_path)
- `Profile` type ('tech' | 'ain')

Create `src/common/config.ts` with ConfigService (loads env vars, profile settings).

**Done when**: Both files compile with no TypeScript errors.

---

## Prompt 03 — LLM service (OpenRouter wrapper)

Create `src/intelligence/llm.service.ts`:

- `call(prompt, role, options)` — calls OpenRouter API, retries once on failure
- `callJson<T>(prompt, role, options)` — calls OpenRouter, strips markdown fences, parses JSON
- `getEmbedding(text)` — calls OpenRouter embeddings API

Models:
- coordinator: `meta-llama/llama-3.1-8b-instruct:free`
- analyst: `google/gemma-2-9b-it:free`
- writer: `mistralai/mistral-7b-instruct:free`
- scorer: `meta-llama/llama-3.1-8b-instruct:free`
- embeddings: `huggingface/sentence-transformers/all-MiniLM-L6-v2`

Write unit test in `src/intelligence/llm.service.spec.ts`.

**Done when**: Tests pass, LlmService injectable.

---

## Prompt 04 — Supabase service + database schema

Run SQL in Supabase SQL editor (see `AGENT_PROMPTS.md` Prompt 04 for schema).

Create `src/tracking/database.service.ts`:

- `saveApplication(app)` — upsert application
- `updateStatus(id, status)` — update status
- `markResponded(id)` — mark as responded
- `getSeenJobIds()` — return set of seen job IDs
- `getOutcomeStats()` — return outcome stats
- `getPendingApprovals()` — return pending approvals
- `storeEmbedding(jobId, meta, embedding)` — store job embedding
- `findSimilarJobs(embedding, threshold)` — find similar jobs via pgvector

**Done when**: DatabaseService injects, connects to Supabase, `getSeenJobIds()` returns without error.

---

## Prompt 05 — Scraper services

Create `src/scrapers/base-scraper.service.ts`:

- UA rotation (3 user agents)
- Rate limit (2-5s between page loads)
- Retry once on failure
- Skip bad cards, log errors

Create scrapers per profile:

**Tech**:
- `src/scrapers/tech/seek.service.ts`
- `src/scrapers/tech/linkedin.service.ts` (public listings only)
- `src/scrapers/tech/indeed.service.ts`

**AIN**:
- `src/scrapers/ain/seek-health.service.ts`
- `src/scrapers/ain/indeed.service.ts`
- `src/scrapers/ain/jora.service.ts`
- `src/scrapers/ain/provider-careers.service.ts`

Each scraper:
- Accepts keywords, location, maxResults
- Returns `Job[]` with source set correctly
- Never throws — logs errors and skips bad cards

**Done when**: Each scraper returns ≥1 job with non-empty description.

---

## Prompt 06 — Analyst agent service

Create `src/agents/analyst.service.ts`:

- `analyseJob(job, resume, profile, outcomeContext)` — scores job fit
- Uses embedding pre-filter (skip if cosine similarity < 0.35)
- Calls LLM with scoring prompt (see `AGENT_PROMPTS.md` Prompt 06)
- Runs company scoring and salary estimation in parallel
- Saves trace JSON to `traces/{job_id}_analyst.json`
- Returns null for jobs below `min_match_score`

**Done when**: `analystService.analyseJob(job, resume, 'tech', '')` returns a ScoredJob with score, reasoning, missing fields.

---

## Prompt 07 — Writer agent service

Create `src/agents/writer.service.ts`:

- `tailorResume(job, scored, resume, profile, variant)` — rewrites resume per job
  - Variant A: lead with technical depth (tech) / care experience (AIN)
  - Variant B: lead with shipped products (tech) / outcomes (AIN)
  - Saves to `output/{profile}/{job_id}/resume_variant_{A|B}.md`
- `writeCoverLetter(job, scored, resume, profile)` — writes cover letter
  - 3 paragraphs, under 220 words
  - Profile-specific tone (tech = confident, AIN = compassionate)
  - Saves to `output/{profile}/{job_id}/cover_letter.txt`

**Done when**: `tailorResume` returns valid Markdown matching resume structure, `writeCoverLetter` returns string under 300 words.

---

## Prompt 08 — Scout agent service

Create `src/agents/scout.service.ts`:

- `run(profile, roles, locations)` — orchestrates job discovery
- For each role × location, calls profile-specific scrapers
- Checks results against `DatabaseService.getSeenJobIds()`
- Applies semantic dedup (embeddings, similarity > 0.92)
- Returns `ScoutResult` with jobs + stats

**Done when**: `scoutService.run('tech', ['React developer'], ['Sydney'])` returns ScoutResult with ≥1 job.

---

## Prompt 09 — Coordinator service

Create `src/agents/coordinator.service.ts`:

- `run(profile, config)` — orchestrates full pipeline
  1. Load profile's resume from `data/profiles/{profile}/resume.md`
  2. Call `DatabaseService.getOutcomeStats()` → build outcome context
  3. Call `ScoutService.run(profile, roles, locations)`
  4. Prioritise jobs by keyword match
  5. For each job (max 50): call `AnalystService.analyseJob()`
  6. Filter by `min_match_score`
  7. Sort by match_score × company_score
  8. Cap to `max_daily_applications`
  9. For each qualified job: tailor resume + write cover letter
  10. Save to DB with status PENDING
  11. If `notifyCallback`: send approval message
  12. If `approvalCallback`: await response
  13. If approved: call `ExecutorService.execute()`
  14. Send final summary

**Done when**: `coordinatorService.run('tech', { roles: ['React developer'], locations: ['Sydney'] })` completes and saves ≥1 application.

---

## Prompt 10 — Excel tracker service

Create `src/tracking/excel.service.ts`:

- File path: `data/applications.xlsx` (or per-profile sheets)
- `appendRow(app, status)` — append one row per application
- `updateStatus(company, status)` — update most recent row
- `getFilePath()` — return absolute path

Color code rows by status (applied = green, responded = blue, interview = yellow, rejected = red, manual = orange).

**Done when**: Two `appendRow` calls produce valid .xlsx with 2 data rows, correct colors.

---

## Prompt 11 — Discord bot service

Create `src/discord/discord.service.ts`:

Slash commands:
- `/run-tech [keywords] [location]` — run tech pipeline
- `/run-ain [keywords] [location]` — run AIN pipeline
- `/status` — outcome stats per profile
- `/jobs` — pending approvals
- `/report` — attach Excel
- `/responded [company]` — mark as responded
- `/strategy` — current strategy per profile
- `/pause` — pause runs

Approval flow: embed with ✅/⏭ buttons, 60s timeout, default skip.

**Done when**: `/run-tech` triggers pipeline, posts approval embed for first qualified job.

---

## Prompt 12 — Scheduler service

Create `src/scheduler/scheduler.service.ts`:

Cron jobs:
- Tech: `0 9 * * 1-5` (9am weekdays)
- AIN: `0 9 30 * * 1-5` (9:30am weekdays)
- Stale checker: `0 10 * * 1` (10am Mondays)

Manual trigger: `triggerRun(profile, roles?, locations?)`.

**Done when**: Scheduler starts, logs next scheduled run time, manual trigger works.

---

## Prompt 13 — App module wiring

Update `src/app.module.ts` to wire all modules:

- IntelligenceModule (exports: LlmService)
- ScrapersModule (exports: all scrapers)
- TrackingModule (exports: DatabaseService, ExcelService, ProfileService)
- AgentsModule (imports: Intelligence, Scrapers, Tracking — exports: CoordinatorService)
- ExecutorModule (imports: Agents, Tracking)
- DiscordModule (imports: Agents, Tracking)
- SchedulerModule (imports: Agents, Discord)

AppModule imports all + ConfigModule + ScheduleModule.

`main.ts`: create NestJS app, set validation pipe, start on port 3001.

**Done when**: `npm run start:dev` starts all modules, registers Discord commands, logs "CareerPilot ready".

---

## Prompt 14 — Next.js dashboard

Create Next.js 14 app in `dashboard/`:

```bash
npx create-next-app@latest dashboard --typescript --tailwind --app --no-src-dir
cd dashboard
npm install @supabase/supabase-js recharts @tanstack/react-table
```

Pages:
- `app/page.tsx` — main dashboard (4 metric cards, 3 charts, applications table)
- `app/traces/[jobId]/page.tsx` — trace viewer

Components:
- `components/StatusBadge.tsx`

**Done when**: Dashboard loads, shows real data from Supabase, all 3 charts render.

---

## Prompt 15 — Feedback loop integration

Update CoordinatorService to implement feedback loop:

1. After `getOutcomeStats()`, call LLM with outcome context prompt
2. Store `outcomeContext` (best_source, best_score_band, best_variant, avoid_patterns, strategy_note)
3. Pass `strategy_note` to Analyst's scoring prompt
4. Adjust Scout priority (best source first)
5. Adjust Writer variant selection (best variant 70% of time)
6. Log strategy to Discord

Add weekly summary report (cron: Monday 9am).

**Done when**: After marking 2+ applications as responded, next run shows different `strategy_note` than "No data yet".

---

## Prompt 16 — OpenClaw skill files

Create `openclaw-skills/` with 7 skill files (1 common + 3 tech + 3 AIN).

Each skill file:
- Describes what the skill does
- Step-by-step instructions for OpenClaw
- Trigger phrases
- Configuration required
- Output files produced
- Usage examples
- Limitations

**Done when**: Skill files are clear enough for a non-technical user to follow.
