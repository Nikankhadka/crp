# Resume Refiner

A job-agnostic resume engine. It scores, tailors and renders resumes against a job
advertisement using a personal seed bank, with no industry-specific vocabulary baked into
the prompts.

This slice ships the command-line score, tailor and render paths, the generic seed bank, the
universal prompt base, the anti-fabrication guard, and the Typst one-page renderer.

## Requirements

- Node 22 (`node --version` must print `v22.x`).
- `typst` and poppler's `pdfinfo` on PATH for rendering (`brew install typst poppler`).

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
