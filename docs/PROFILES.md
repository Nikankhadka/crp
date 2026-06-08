# Profiles

CareerPilot supports multiple job-search profiles, each with its own resume, cover letter, preferences, and scoring logic.

## Current profiles

### `tech` — Software Engineer

| Field | Value |
|---|---|
| Target roles | Software Engineer, Full Stack Developer, React Developer, Frontend Engineer |
| Target locations | Sydney, Remote |
| Sources | Seek, LinkedIn (public), Indeed |
| Tone | Confident, technical, metrics-driven |
| Daily cap | 15 applications |
| Auto-apply | Strict guardrails (first 5 require human approval) |
| Schedule | 9:00 AM weekdays |

**Resume highlights**: React, Next.js, Node.js, TypeScript, PostgreSQL, Docker, Playwright, Azure OpenAI. Paypipe (AI Software Engineer), Eightbit/Dzangolab (Full Stack).

### `ain` — Assistant in Nursing

| Field | Value |
|---|---|
| Target roles | Assistant in Nursing, Aged Care Worker, Disability Support Worker, Personal Care Assistant |
| Target locations | Sydney, NSW |
| Sources | Seek Healthcare, Indeed, Jora, provider careers |
| Tone | Compassionate, person-centred, care-focused |
| Daily cap | 10 applications |
| Auto-apply | Full auto with all guardrails |
| Schedule | 9:30 AM weekdays |

**Resume highlights**: Certificate III Individual Support (Ageing & Disability), aged care placement, personal care, mobility support, infection control.

## Profile structure

Each profile lives in `data/profiles/{profile_name}/`:

```
data/profiles/tech/
├── resume.md           # Base resume (Markdown)
├── cover_letter.md     # Base cover letter template
└── preferences.md      # Target roles, locations, scoring, tone, blacklist

data/profiles/ain/
├── resume.md
├── cover_letter.md
└── preferences.md
```

## How profiles are used

1. **Scout** reads `preferences.md` to determine which sources and keywords to search.
2. **Analyst** uses `resume.md` to score job fit (profile-specific scoring prompt).
3. **Writer** uses `resume.md` + `cover_letter.md` + `preferences.md` tone to tailor materials.
4. **Executor** uses `preferences.md` auto-apply settings and guardrails.
5. **Output** is written to `output/{profile}/{date}_{company}_{slug}/`.

## Adding a new profile

1. Create `data/profiles/{new_profile}/` with `resume.md`, `cover_letter.md`, `preferences.md`.
2. Add scraper configs for the profile's target sources in `src/scrapers/{new_profile}/`.
3. Add Discord commands: `/run-{new_profile}`.
4. Add cron schedule in `src/scheduler/scheduler.service.ts`.

## Shared blacklist

`data/shared/blacklist.md` contains companies to avoid for ALL profiles. Profile-specific blacklists go in each profile's `preferences.md`.
