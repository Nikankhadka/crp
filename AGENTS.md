# AGENTS.md — CareerPilot

## Build workflow

This repo is a set of sequential prompts, not ready-made source code. To build the app:

1. Run each prompt in `AGENT_PROMPTS.md` in order (01 → 16). Each prompt is self-contained.
2. Verify the "Done when:" condition at the end of each prompt before moving to the next.
3. Do not skip or reorder prompts — each builds on the previous.

## Tech stack

- **Backend:** NestJS + TypeScript, port 3001 (3000 reserved for dashboard)
- **Database:** Supabase (Postgres + pgvector)
- **LLM:** OpenRouter (free models: LLaMA 3.1, Gemma 2, Mistral)
- **Scraping:** Playwright (headless Chromium)
- **Bot:** discord.js v14 with slash commands
- **Dashboard:** Next.js 14 (App Router) + Tailwind, reads Supabase directly
- **Libraries:** exceljs, @nestjs/schedule, @nestjs/config, axios, bull

## Environment

Requires `.env` at project root with these keys before any run:
```
OPENROUTER_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
DISCORD_BOT_TOKEN=
DISCORD_CHANNEL_ID=
TARGET_ROLES=
TARGET_LOCATIONS=
MIN_MATCH_SCORE=65
MAX_DAILY_APPLICATIONS=20
AUTO_APPLY=false
```

## Project structure (after build)

```
src/
├── agents/          # Coordinator, Analyst, Writer, Scout services
├── intelligence/    # LlmService (OpenRouter wrapper)
├── scrapers/        # SeekService (Playwright), later LinkedIn, Indeed
├── tracking/        # DatabaseService (Supabase), ExcelService
├── discord/         # DiscordService (slash commands, approval flow)
├── scheduler/       # Cron jobs (daily run, stale app checker)
├── common/          # models.ts, config.ts
├── app.module.ts
└── main.ts
data/
├── resume.json
├── resumes/
├── applications.xlsx
traces/
output/
dashboard/           # Next.js app (separate `npm run dev`)
```

## Key commands

```bash
npm run start:dev    # NestJS dev server (port 3001)
npm run test         # Jest (single test: `npm test -- --testPathPattern llm.service`)
```

## Not in this repo

- `OPENCLAW_PHASE1.md` documents a separate lightweight approach using the OpenClaw desktop app — not part of the NestJS build.
- OpenClaw skill files referenced in Prompt 16 go into `~/.openclaw/skills/`, not this repo.

## Conventions

- NestJS `@Injectable()` + constructor DI throughout. No manual instantiation.
- All LLM calls go through `LlmService` only. Never call OpenRouter directly from other services.
- Playwright browser lifecycle managed by `SeekService` (`onModuleDestroy` closes browser).
- Supabase schema created via SQL editor (SQL provided in Prompt 04). No migrations framework.
- Traces saved to `traces/` directory as timestamped JSON files for debugging LLM calls.
