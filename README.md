# Resume Refiner

A job-agnostic resume engine. It scores, tailors and renders resumes against a job
advertisement using a personal seed bank, with no industry-specific vocabulary baked into
the prompts.

This slice ships the command-line score, tailor and render paths, the generic seed bank, the
universal prompt base, the anti-fabrication guard, and the Typst one-page renderer.

## Requirements

- Node 22 (`node --version` must print `v22.x`).
- `typst` on PATH for rendering (`brew install typst`). On linux x64 hosts without it, run
  `node scripts/fetch-typst.mjs` to download the pinned binary into `bin/`, or set `TYPST_BIN`.

## Setup

```bash
cp .env.example .env   # then add your OpenCode Zen key
npm install
```

A single OpenCode Zen key is enough. Set it as `LLM_API_KEY`, or as `OPENCODE_API_KEY` (an
alias for the same key). The app defaults to the free Zen gateway
(`https://opencode.ai/zen/v1`) and the free model `nemotron-3.5-lightning-free`, so no other
configuration is required. Set `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY` or
`OPENCODE_API_KEY` to override those defaults.

The free model pool rotates, so when a model is retired switch it with an env change rather
than a code change. An optional fallback (`LLM_FALLBACK_MODEL`, defaulting to the free
`nemotron-3-ultra-free`; base URL and key default to the primary) is used once when the
primary returns 429, 5xx or times out.

## Commands

```bash
npm run check          # typecheck with tsc --noEmit
npm test               # run the vitest suite (no network)
npx tsx src/cli.ts <jd.txt>            # score + tailor + render one-page PDF
npx tsx src/cli.ts score <jd.txt>      # debug: score only
npx tsx src/cli.ts tailor <jd.txt>     # debug: score + tailor JSON
```

Every command reads `seed/me/profile.yaml`, `seed/me/resume.yaml` and `seed/me/personal.md`.
`score` scores the job description file against them and prints the validated score as JSON.
`tailor` runs `score` first, then tailors the bank to the same job and prints
`{ score, tailored }` as JSON.

The default command runs score then tailor, merges the result against the bank (org, title,
dates and tech always come from the bank), renders `templates/resume.typ` to a PDF, and drops
trailing bullets to fit one page. It writes `out/local/<jd-slug>/v1/`: `score.json`,
`resume.json`, `resume.pdf`, and `cover-letter.md` when the tailored result carries one, then
prints the score, gaps, output directory and page count. The optional `pageTarget` key in
`seed/me/profile.yaml` sets the page count the renderer shrinks toward (default `1`).

Every tailored bullet cites a bank `sourceId`, and the guard rejects unknown ids, invented
numbers, rewrites that drift from their source, unknown skills, and unsupported vocabulary
before the result is returned. The seed bank is generic: `sections` is a free-form list of
`{ type, items }`, so any section a person needs works without schema changes.

## Hosted app: database and deploy

The web app keeps jobs, generated files (PDF, DOCX, JSON, cover letter), reference docs and the
seed bank in Postgres, so it runs on a read-only serverless filesystem.

- Local dev needs no setup: with `DATABASE_URL` unset it uses embedded Postgres (PGlite), stored
  in `storage/pgdata`. On first start it imports `BOOTSTRAP_SEED_DIR` and `BOOTSTRAP_DOCS_DIR`
  into the owner account (`OWNER_EMAIL`, default `owner@local`) when that account is empty; it
  never overwrites existing data. These two only ever apply to the owner.
- Vercel + Supabase: set `DATABASE_URL` to the Supabase transaction pooler connection string
  (port 6543) ending in `?sslmode=no-verify`, plus `APP_PASSWORD`, `SESSION_SECRET`,
  `LLM_API_KEY` and `OWNER_EMAIL`. pg-connection-string 2.14 treats `sslmode=require` as
  `verify-full`, which fails against Supabase's certificate chain, and a URL without any
  `sslmode` connects in plaintext. The schema is applied on server start, or manually with
  `npm run db:migrate` (do not run it while `next dev` holds `storage/pgdata`; PGlite is
  single-process). Generations run after the response (`after()`, up to 300 seconds); a job that
  dies mid-run is marked `timed out` after `JOB_STALE_SECONDS` (default 420) the next time it is
  read. Consider a lower `LLM_TIMEOUT_MS` (e.g. 45000) on Vercel.

## Hosted app: accounts and invites

The app is invite-only; there is no public signup.

- First login: the owner account is created on first use. Sign in at `/login` with `OWNER_EMAIL`
  (default `owner@local`) and `APP_PASSWORD`. `APP_PASSWORD` only seeds the owner's password while
  the owner has none (at least 10 characters; `replace-me` is ignored); editing the variable later
  does not change an existing password. The owner is the admin. `SESSION_SECRET` signs the session
  cookie and must be set (`openssl rand -base64 32`); in production a secret shorter than 32
  characters counts as missing and nobody can sign in.
- Invite someone: as the owner open `Invites` in the nav (`/admin/invites`), optionally enter their
  email (the invite then only works for that email) and an expiry (default 7 days), and click
  `Create invite`. Copy the signup link shown; it is displayed once and only its hash is stored, so
  create a new invite if it is lost. Revoke an unused invite from the same page. Each link works
  once.
- The invited person opens the link, picks a password (at least 10 characters), and lands on
  onboarding. Their seed bank, docs and jobs are their own; nobody else, including the owner, sees
  them in the app.
- Onboarding: paste the resume text or upload a PDF (up to 5 MB; scans without a text layer need
  pasted text). The model drafts the three bank documents (`profile.yaml`, `resume.yaml`,
  `personal.md`) and shows any warnings, for example a name it could not find in the resume.
  Review and edit them, then save. The draft is never saved until you do, and the `Bank` page
  edits the same documents later. Until a bank is saved, `New` and `Jobs` send you to onboarding.
