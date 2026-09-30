# AGENTS.md - Resume Refiner

## Purpose

A job-agnostic resume engine. It scores and tailors resumes against a job advertisement
using a personal seed bank, without hard-coding any occupation.

## Repo layout

```
prompts/base/     universal, job-agnostic prompt files (system.md, one task file per task)
src/core/         schemas.ts (zod), prompt.ts (assembly), score.ts (score task)
src/providers/    llm.ts (OpenAI-compatible client with fallback and JSONL traces)
src/cli.ts        the `score <jd.txt>` entry point
seed/me/          personal seed bank: profile.yaml, resume.yaml, personal.md (gitignored)
test/             vitest tests and fixtures (no network)
traces/           llm-calls.jsonl traces (gitignored)
```

## Key commands

```bash
npm install
npm run check
npm test
npx tsx src/cli.ts score <jd.txt>
```

## Conventions

- All LLM calls go through `src/providers/llm.ts`. Never call a provider directly elsewhere.
- Prompts are files under `prompts/base`. Task prompts must stay job-agnostic: no
  occupation-specific vocabulary.
- Personal data lives in `seed/me/` or the database, never in `prompts/base`.
- `prompts/base` output is JSON only; every generated bullet cites the bank id it used.
- Keep code minimal and boring. No build step; run TypeScript directly with tsx.
