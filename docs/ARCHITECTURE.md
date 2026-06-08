# Architecture

## System diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CareerPilot                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Scout   │───>│ Analyst  │───>│  Writer  │───>│ Executor │  │
│  │ (find    │    │ (score   │    │ (tailor  │    │ (submit  │  │
│  │  jobs)   │    │  fit)    │    │  resume) │    │  apply)  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │               │               │               │         │
│       v               v               v               v         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Scrapers │    │   LLM    │    │   LLM    │    │Guardrails│  │
│  │ (Seek,   │    │(OpenRout)│    │(OpenRout)│    │ (rate,   │  │
│  │ LinkedIn,│    │          │    │          │    │  captcha,│  │
│  │ Indeed,  │    │          │    │          │    │  blacklist│ │
│  │ Jora,    │    │          │    │          │    │          │  │
│  │ Provider)│    │          │    │          │    │          │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Tracking Layer                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │   │
│  │  │ Supabase │  │  Excel   │  │  Traces  │               │   │
│  │  │(Postgres)│  │  (.xlsx) │  │  (JSON)  │               │   │
│  │  └──────────┘  └──────────┘  └──────────┘               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Interface Layer                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │   │
│  │  │ Discord  │  │Dashboard │  │Scheduler │               │   │
│  │  │  (bot)   │  │ (Next.js)│  │  (cron)  │               │   │
│  │  └──────────┘  └──────────┘  └──────────┘               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Agent flow

### 1. Scout (job discovery)
- Reads `preferences.md` for target roles, locations, sources.
- Runs scrapers for each source (Seek, LinkedIn, Indeed, Jora, provider careers).
- Deduplicates jobs via Supabase (seen job IDs) + semantic similarity (embeddings).
- Returns `Job[]` with metadata.

### 2. Analyst (scoring)
- Loads profile's `resume.md`.
- For each job: calls LLM to score fit (0-100) against resume.
- Filters by `min_match_score` from preferences.
- Returns `ScoredJob[]` with score, reasoning, missing keywords, strengths.

### 3. Writer (tailoring)
- For each qualified job: tailors resume + writes cover letter.
- Uses profile-specific tone (tech = confident, AIN = compassionate).
- Saves to `output/{profile}/{date}_{company}_{slug}/`.
- Returns `Application[]` with tailored materials.

### 4. Executor (auto-apply)
- For each application: checks guardrails (daily cap, per-company cap, cooldown, captcha, blacklist).
- If approved: fills form via Playwright, submits.
- If blocked: marks `manual_required`, notifies Discord.
- Updates status in Supabase + Excel.

## Data model

### Job
```typescript
interface Job {
  id: string
  title: string
  company: string
  location: string
  url: string
  source: 'seek' | 'linkedin' | 'indeed' | 'jora' | 'provider'
  description: string
  salary_text: string
  posted_date?: string
  scraped_at: Date
}
```

### ScoredJob
```typescript
interface ScoredJob {
  job: Job
  match_score: number
  missing_keywords: string[]
  strengths: string[]
  reasoning: string
  recommended_angle: string
}
```

### Application
```typescript
interface Application {
  id: string
  profile: 'tech' | 'ain'
  job: Job
  scored: ScoredJob
  resume_version: string
  cover_letter: string
  status: ApplicationStatus
  applied_at?: Date
  response_received: boolean
  trace_path: string
}
```

## Profile-aware routing

The `ProfileService` loads the correct profile based on the `profile` parameter:
- `data/profiles/{profile}/resume.md`
- `data/profiles/{profile}/cover_letter.md`
- `data/profiles/{profile}/preferences.md`

Each agent (Scout, Analyst, Writer, Executor) accepts a `profile` parameter and routes through `ProfileService`.

## Guardrails framework

The `Executor` uses 8 guardrails:
1. **Daily cap**: Max applications per day per profile.
2. **Per-company cap**: Max 1 application per company per 24h.
3. **Cooldown**: 30-60s jitter between submits.
4. **Captcha detector**: Pauses run, notifies Discord, marks `manual_required`.
5. **Blacklist**: Skips companies in `blacklist.md` or profile preferences.
6. **First-N approval**: First 5 submits require human click (Discord button).
7. **Dry-run mode**: Logs actions without clicking submit.
8. **Rollback**: Reverts status on 4xx/5xx errors.

## Feedback loop

After each run:
1. Query Supabase for outcome stats (response rate by variant, source, score band).
2. Call LLM to generate strategy note.
3. Adjust Scout priority (best source first).
4. Adjust Writer variant selection (best variant 70% of the time).
5. Log strategy to Discord.
