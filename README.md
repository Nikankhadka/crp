# Resume Refiner

A job-agnostic resume engine. It scores and (in later slices) tailors resumes against a
job advertisement using a personal seed bank, with no industry-specific vocabulary baked
into the prompts.

This slice ships the command-line score path, the universal prompt base, and the personal
seed bank.

## Requirements

- Node 22 (`node --version` must print `v22.x`).

## Setup

```bash
cp .env.example .env   # then fill in your provider keys
npm install
```

## Commands

```bash
npm run check          # typecheck with tsc --noEmit
npm test               # run the vitest suite (no network)
npx tsx src/cli.ts score <jd.txt>
```

`score` reads `seed/me/profile.yaml`, `seed/me/resume.yaml` and `seed/me/personal.md`,
scores the job description file against them, and prints the validated score as JSON.
