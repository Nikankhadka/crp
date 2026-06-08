# Roadmap

Phased build plan with milestones and "Done when" checkpoints.

## Phase 0 — Foundation [Day 1, ~2h]

**Goal**: Repo ready, docs written, profiles set up.

- [x] T0.1 Create folder skeleton
- [x] T0.2 Write `.gitignore`, `.env.example`
- [x] T0.3 Write `README.md`
- [x] T0.4 Write `docs/VIABILITY.md` (thorough)
- [x] T0.5 Write `docs/DECISIONS.md` (thorough)
- [x] T0.6 Write `docs/PROFILES.md`
- [x] T0.7 Write `docs/ARCHITECTURE.md` (concise)
- [x] T0.8 Write `docs/ROADMAP.md` (concise)
- [x] T0.9 Write `docs/FOLDER_STRUCTURE.md` (concise)
- [ ] T0.10 Write `docs/AGENT_PROMPTS_v2.md` (concise)
- [ ] T0.11 Write 7 `openclaw-skills/*/SKILL.md` files
- [ ] T0.12 Write `data/profiles/tech/preferences.md`
- [ ] T0.13 Write `data/profiles/ain/preferences.md`
- [ ] T0.14 Write `data/shared/blacklist.md`
- [ ] T0.15 Move + clean 4 dropped files into `data/profiles/{tech,ain}/`
- [ ] T0.16 Add `.gitkeep` to gitignored dirs
- [ ] T0.17 Verify with `tree` + `ls -la`

**Done when**: Folder tree matches spec, all docs readable, dropped files cleaned and placed.

**Compact**: Yes, after Phase 0.

---

## Phase 1 — OpenClaw Quick Win [Day 1-2, ~30min active]

**Goal**: Working job hunt system by end of day using OpenClaw.

- [ ] T1.1 Install OpenClaw
- [ ] T1.2 Configure OpenRouter free key
- [ ] T1.3 Copy 7 skill files to `~/.openclaw/skills/`
- [ ] T1.4 Verify each profile's resume/cover letter load correctly
- [ ] T1.5 First tech run via OpenClaw chat
- [ ] T1.6 First AIN run via OpenClaw chat
- [ ] T1.7 Verify ≥1 job per profile, ≥1 tailored per profile
- [ ] T1.8 Set `HEARTBEAT.md` (tech 9am, AIN 9:30am)
- [ ] T1.9 Set `MEMORY.md` per profile

**Done when**: 3+ runs per profile, ≥5 tailored application sets per profile in `output/`.

**Compact**: After 3 successful runs per profile.

---

## Phase 2 — NestJS Skeleton [Day 2-3, ~6h]

**Goal**: NestJS app boots, LLM service works.

- [ ] T2.1 `nest new src --package-manager npm`
- [ ] T2.2 Install deps (per AGENT_PROMPTS_v2.md Prompt 01)
- [ ] T2.3 Replicate folder structure inside `src/`
- [ ] T2.4 `src/common/{models,config}.ts`
- [ ] T2.5 `src/common/resume-loader.service.ts` (MD chunker)
- [ ] T2.6 `src/common/profile.service.ts`
- [ ] T2.7 `src/intelligence/llm.service.ts` + unit test
- [ ] T2.8 Verify `npm run start:dev` boots

**Done when**: LlmService injectable, app boots clean.

**Compact**: Yes, after Phase 2.

---

## Phase 3 — Database + Scrapers [Day 3-5, ~10h]

**Goal**: Jobs land in Supabase, all 7 scrapers work.

- [ ] T3.1 User creates Supabase project
- [ ] T3.2 Run SQL schema
- [ ] T3.3 `database.service.ts`
- [ ] T3.4 `base-scraper.service.ts` (UA rotation, jitter, retry)
- [ ] T3.5 `scrapers/tech/seek.service.ts`
- [ ] T3.6 `scrapers/tech/linkedin.service.ts` (public only)
- [ ] T3.7 `scrapers/tech/indeed.service.ts`
- [ ] T3.8 `scrapers/ain/seek-health.service.ts`
- [ ] T3.9 `scrapers/ain/indeed.service.ts`
- [ ] T3.10 `scrapers/ain/jora.service.ts`
- [ ] T3.11 `scrapers/ain/provider-careers.service.ts`
- [ ] T3.12 Test each: returns ≥1 job with non-empty description

**Done when**: All 7 scrapers return jobs; dedup via Supabase works.

**Compact**: After tech scrapers done, and again after AIN scrapers done.

---

## Phase 4 — Agent Layer [Day 5-7, ~14h]

**Goal**: Scout, Analyst, Writer, Coordinator work end-to-end per profile.

- [ ] T4.1 `analyst.service.ts` (profile-aware scoring)
- [ ] T4.2 `writer.service.ts` (tailored MD resume + cover letter)
- [ ] T4.3 `scout.service.ts` (profile-aware source routing)
- [ ] T4.4 `coordinator.service.ts` (full pipeline, profile param)
- [ ] T4.5 `npm run run-once -- --profile=tech` script
- [ ] T4.6 `npm run run-once -- --profile=ain` script
- [ ] T4.7 End-to-end smoke test per profile

**Done when**: Each profile produces ≥3 tailored applications end-to-end.

**Compact**: Yes, after Phase 4.

---

## Phase 5 — Auto-Apply with Guardrails [Day 7-9, ~12h]

**Goal**: Auto-submit with strict guardrails per profile.

- [ ] T5.1 `executor/executor.service.ts`
- [ ] T5.2-5.9 8 guards (daily-cap, per-co-cap, cooldown, captcha, blacklist, first-N, dry-run, rollback)
- [ ] T5.10-5.13 Form handlers (seek-quick-apply, linkedin-easy-apply, indeed-apply, generic-redirect)
- [ ] T5.14 AIN-specific handlers (seek-health-quick-apply, provider-portal-generic)
- [ ] T5.15 Error categorization → retry once or escalate
- [ ] T5.16 First-5 human approval flow (Discord button)
- [ ] T5.17 Dry-run mode end-to-end test
- [ ] T5.18 3 real submits per profile

**Done when**: 3 real submits per profile succeed; first 5 required human click; no bans.

**Compact**: Yes, after Phase 5.

---

## Phase 6 — Discord Bot [Day 9-10, ~6h]

**Goal**: `/run-tech`, `/run-ain`, approval flow, reports.

- [ ] T6.1 User creates Discord bot + token
- [ ] T6.2 `discord.service.ts`
- [ ] T6.3 Commands: `/run-tech`, `/run-ain`, `/status`, `/jobs`, `/report`, `/responded`, `/strategy`, `/pause`
- [ ] T6.4 Approval embed (✅/⏭ buttons, 60s timeout)
- [ ] T6.5 Daily + weekly summary embeds (per profile)
- [ ] T6.6 Slash command registration

**Done when**: Both `/run` commands trigger pipelines; `/report` attaches Excel.

**Compact**: Yes, after Phase 6.

---

## Phase 7 — Excel + Scheduler [Day 10-11, ~4h]

**Goal**: Excel tracker works, daily cron runs per profile.

- [ ] T7.1 `excel.service.ts` (color-coded, per-profile sheets)
- [ ] T7.2 `scheduler.service.ts` (tech 9am, AIN 9:30am, stale-check Mon 10am)
- [ ] T7.3 Manual trigger endpoint

**Done when**: Both crons fire daily; Excel populates per profile.

**Compact**: Yes, after Phase 7.

---

## Phase 8 — Feedback Loop + Dashboard [Day 12-14, ~10h]

**Goal**: System learns from responses, dashboard shows data per profile.

- [ ] T8.1 Outcome stats LLM prompt
- [ ] T8.2 Strategy auto-adjust per profile
- [ ] T8.3 Weekly summary embed (per profile)
- [ ] T8.4 Next.js dashboard
- [ ] T8.5 4 metric cards + 3 charts + applications table
- [ ] T8.6 Trace viewer page
- [ ] T8.7 Vercel deploy

**Done when**: Dashboard shows real data per profile; next run uses past strategy.

**Compact**: Yes, after Phase 8.

---

## Phase 9 — Production Hardening [Day 14+, ongoing]

**Goal**: Runs reliably 24/7, no babysitting.

- [ ] T9.1 winston logging + file rotation
- [ ] T9.2 Health check endpoint
- [ ] T9.3 Discord error channel
- [ ] T9.4 Anti-ban monitor
- [ ] T9.5 Resume version history
- [ ] T9.6 Multi-profile support (easy to add profile #3)

**Done when**: 7 days unattended per profile, no intervention needed.

---

## Work → test → verify → compact loop

For every numbered task:

1. **Work** — write code/file per spec
2. **Test** — run the task's check (test command, manual smoke, or "Done when" criterion)
3. **Verify** — read back the result, confirm it actually works
4. **Compact** — at phase boundaries, run `/compact` to free context
5. **Next** — only move forward when the previous task's "Done when" passes
