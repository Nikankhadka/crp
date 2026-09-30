# Resume Refiner

A job-agnostic resume engine. It scores and (in later slices) tailors resumes against a
job advertisement using a personal seed bank, with no industry-specific vocabulary baked
into the prompts.

This slice ships the command-line score and tailor paths, the universal prompt base, the
personal seed bank, and the anti-fabrication guard.

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
npx tsx src/cli.ts tailor <jd.txt>
```

`score` reads `seed/me/profile.yaml`, `seed/me/resume.yaml` and `seed/me/personal.md`,
scores the job description file against them, and prints the validated score as JSON.

`tailor` runs `score` first, then tailors the bank to the same job and prints
`{ score, tailored }` as JSON. Every tailored bullet cites a bank `sourceId`, and the guard
rejects unknown ids, invented numbers, rewrites that drift from their source, unknown skills,
and unsupported vocabulary before the result is returned.
