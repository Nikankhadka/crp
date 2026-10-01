# AGENTS.md - Resume Refiner

## Purpose

A job-agnostic resume engine. It scores and tailors resumes against a job advertisement
using a personal seed bank, without hard-coding any occupation.

## Repo layout

```
prompts/base/       universal, job-agnostic prompt files (system.md, one task file per task)
src/core/           schemas.ts (zod), bank.ts (seed schema), guard.ts, prompt.ts, score.ts, tailor.ts
src/providers/      llm.ts (OpenAI-compatible client with fallback and JSONL traces)
src/render/         typst.ts (merge, render, one-page shrink loop)
templates/          resume.typ (generic, ATS-safe single-column template)
src/server/         hosted-app server code: db.ts (PGlite or pg), migrations.ts (embedded, append-only),
                    jobStore/docsStore/seedBank (user-scoped Postgres stores), generate.ts, bootstrap.ts,
                    currentUser.ts (the seam for the signed-in user)
scripts/            fetch-typst.mjs (pinned linux typst binary into bin/, gitignored),
                    migrate.ts (`npm run db:migrate`)
src/cli.ts          the `[score|tailor] <jd.txt>` entry point
seed/me/            personal seed bank: profile.yaml, resume.yaml, personal.md (gitignored)
test/               vitest tests and fixtures (no network)
storage/            local dev PGlite data (pgdata/) and LLM traces (traces/llm-calls.jsonl), gitignored
out/                rendered score/resume artifacts (gitignored)
```

## Key commands

```bash
npm install
npm run check
npm test
npm run db:migrate                      # apply schema migrations (the server also migrates on start)
npx tsx src/cli.ts <jd-file>            # score + tailor + render one-page PDF
npx tsx src/cli.ts score <jd-file>      # debug: score only
npx tsx src/cli.ts tailor <jd-file>     # debug: score + tailor JSON
```

Rendering needs `typst` (`brew install typst`). The binary is resolved from `TYPST_BIN`, else
`bin/typst-linux-x64` on linux (fetched by `node scripts/fetch-typst.mjs`, which `vercel-build`
runs), else `typst` on PATH. Page counts are read in pure JS with `pdf-lib`; no system PDF tool is needed.
The default command writes `out/local/<jd-slug>/v1/`: score.json, resume.json, resume.typ
(the template copy typst compiles), resume.pdf, and cover-letter.md when the tailored result
carries one.

## Conventions

- The hosted app stores jobs, artifacts, docs and seed banks in Postgres: `DATABASE_URL` selects
  `pg` (Supabase), unset selects embedded PGlite (`<STORAGE_DIR>/pgdata` in dev, in memory under
  test). Every store function takes `userId` first and filters by it; another user's data must be
  indistinguishable from missing. Schema changes are new entries in `src/server/migrations.ts`
  (append-only, never edit an applied one).
- No filesystem writes in server code except under `os.tmpdir()` (the deploy filesystem is
  read-only). The only exceptions are local-dev PGlite data and best-effort LLM traces in
  `llm.ts`, which must never fail a call.
- Tests use `freshDb()` from `test/db-helper.ts` (in-memory PGlite, users A and B); no network.
- All LLM calls go through `src/providers/llm.ts`. Never call a provider directly elsewhere.
- Prompts are files under `prompts/base`. Task prompts must stay job-agnostic: no
  occupation-specific vocabulary.
- Personal data lives in `seed/me/` or the database, never in `prompts/base`.
- `prompts/base` output is JSON only; every generated bullet cites the bank id it used.
- The bank is generic: `sections` is a free-form list of `{ type, items }`, so any section a
  person needs works without schema changes. Item, summary, skill and basics objects keep
  unknown fields; the top level is strict, so a misplaced key errors loudly.
- Org, title, name, credentials and dates are always resolved from the bank at merge time,
  never taken from the model. Only bullet text and the summary rewrite come from the model.
- Keep code minimal and boring. No build step; run TypeScript directly with tsx.
