# CareerPilot — Agent Development Prompts
# Feed each numbered prompt into your coding agent (Claude Code / Cursor / Copilot) in order.
# Each prompt is self-contained with full context. Do not skip steps.

---

## HOW TO USE THIS FILE

Paste each PROMPT block into your agent exactly as written.
Each prompt builds on the previous. Complete and verify each before moving to the next.
Stack used: NestJS · TypeScript · Supabase · OpenRouter · Playwright · discord.js · Next.js

---

════════════════════════════════════════════════════════════════
PROMPT 01 — Project scaffold + environment
════════════════════════════════════════════════════════════════

Create a new NestJS TypeScript project called "careerpilot" with the following setup:

1. Scaffold with: `nest new careerpilot --package-manager npm --language TypeScript`

2. Install all dependencies:
```
npm install @supabase/supabase-js @nestjs/schedule @nestjs/config
npm install discord.js playwright exceljs bull @bull-board/nestjs
npm install class-validator class-transformer dotenv
npm install @types/node axios
npm install --save-dev @types/bull
```

3. Create this exact folder structure:
```
src/
├── agents/
├── intelligence/
├── scrapers/
├── tracking/
├── discord/
├── scheduler/
├── common/
├── app.module.ts
└── main.ts

data/
├── resume.json          (empty template)
├── resumes/             (folder)
traces/                  (folder)
output/                  (folder)
```

4. Create `.env` with these keys (no values):
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

5. Create `.gitignore` that excludes:
- .env
- data/
- traces/
- output/
- node_modules/

6. Create `data/resume.json` with this schema:
```json
{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "summary": "",
  "skills": [],
  "experience": [
    {
      "company": "",
      "title": "",
      "dates": "",
      "bullets": []
    }
  ],
  "education": [
    { "institution": "", "degree": "", "dates": "" }
  ],
  "projects": [
    { "name": "", "description": "", "tech": [], "url": "" }
  ]
}
```

Done when: `npm run start:dev` runs without errors.

---

════════════════════════════════════════════════════════════════
PROMPT 02 — Core data models
════════════════════════════════════════════════════════════════

In the CareerPilot NestJS project, create `src/common/models.ts` with these exact TypeScript interfaces and enums. Do not change field names — they map to the Supabase schema.

```typescript
export enum ApplicationStatus {
  FOUND      = 'found',
  SCORED     = 'scored',
  TAILORED   = 'tailored',
  PENDING    = 'pending_approval',
  APPLIED    = 'applied',
  MANUAL     = 'manual_required',
  RESPONDED  = 'responded',
  INTERVIEW  = 'interview',
  REJECTED   = 'rejected',
  GHOSTED    = 'ghosted',
}

export interface Job {
  id: string
  title: string
  company: string
  location: string
  url: string
  source: 'seek' | 'linkedin' | 'indeed' | 'company'
  description: string
  salary_text: string
  posted_date?: string
  scraped_at: Date
}

export interface ScoredJob {
  job: Job
  match_score: number
  missing_keywords: string[]
  strengths: string[]
  company_score?: number
  company_signal?: 'growing' | 'stable' | 'uncertain' | 'avoid'
  salary_estimate?: string
  reasoning: string
  recommended_angle: string
}

export interface Application {
  id: string
  job: Job
  scored: ScoredJob
  resume_version: string
  cover_letter: string
  status: ApplicationStatus
  variant_label: 'A' | 'B'
  applied_at?: Date
  response_received: boolean
  response_at?: Date
  trace_path: string
}

export interface MasterResume {
  name: string
  email: string
  phone: string
  location: string
  summary: string
  skills: string[]
  experience: Array<{
    company: string
    title: string
    dates: string
    bullets: string[]
  }>
  education: Array<{
    institution: string
    degree: string
    dates: string
  }>
  projects: Array<{
    name: string
    description: string
    tech: string[]
    url?: string
  }>
}

export interface OutcomeStat {
  variant_label: string
  source: string
  score_band: string
  total: number
  responses: number
  response_rate: number
}

export interface RunConfig {
  roles?: string[]
  locations?: string[]
  max_applications?: number
  notifyCallback?: (msg: string) => Promise<void>
  approvalCallback?: (app: Application) => Promise<boolean>
}
```

Also create `src/common/config.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import { MasterResume } from './models'

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
export const EMBEDDING_URL  = 'https://openrouter.ai/api/v1/embeddings'

export const MODELS = {
  coordinator: 'meta-llama/llama-3.1-8b-instruct:free',
  analyst:     'google/gemma-2-9b-it:free',
  writer:      'mistralai/mistral-7b-instruct:free',
  scorer:      'meta-llama/llama-3.1-8b-instruct:free',
  embeddings:  'huggingface/sentence-transformers/all-MiniLM-L6-v2',
}

@Injectable()
export class ConfigService {
  get openrouterKey(): string  { return process.env.OPENROUTER_API_KEY ?? '' }
  get supabaseUrl(): string    { return process.env.SUPABASE_URL ?? '' }
  get supabaseKey(): string    { return process.env.SUPABASE_SERVICE_KEY ?? '' }
  get discordToken(): string   { return process.env.DISCORD_BOT_TOKEN ?? '' }
  get channelId(): string      { return process.env.DISCORD_CHANNEL_ID ?? '' }
  get minScore(): number       { return parseInt(process.env.MIN_MATCH_SCORE ?? '65') }
  get maxDailyApps(): number   { return parseInt(process.env.MAX_DAILY_APPLICATIONS ?? '20') }
  get autoApply(): boolean     { return process.env.AUTO_APPLY === 'true' }
  get targetRoles(): string[]  { return (process.env.TARGET_ROLES ?? '').split(',').map(s => s.trim()) }
  get targetLocations(): string[] { return (process.env.TARGET_LOCATIONS ?? '').split(',').map(s => s.trim()) }

  loadResume(): MasterResume {
    const p = path.join(process.cwd(), 'data', 'resume.json')
    return JSON.parse(fs.readFileSync(p, 'utf-8'))
  }
}
```

Done when: both files compile with no TypeScript errors.

---

════════════════════════════════════════════════════════════════
PROMPT 03 — LLM service (OpenRouter wrapper)
════════════════════════════════════════════════════════════════

In the CareerPilot NestJS project, create `src/intelligence/llm.service.ts`.

This service wraps all OpenRouter API calls. It must:
- Accept a prompt, agent role, and optional system message
- Use the correct model per role from MODELS config
- Handle JSON mode by appending instruction and stripping markdown fences
- Retry once on failure before throwing
- Log model used + latency to console

```typescript
import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import { ConfigService, MODELS, OPENROUTER_URL } from '../common/config'

type AgentRole = keyof typeof MODELS

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name)

  constructor(private config: ConfigService) {}

  async call(
    prompt: string,
    role: AgentRole = 'analyst',
    options: { system?: string; temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    const model = MODELS[role]
    const messages = []
    if (options.system) messages.push({ role: 'system', content: options.system })
    messages.push({ role: 'user', content: prompt })

    const start = Date.now()
    try {
      const res = await axios.post(
        OPENROUTER_URL,
        {
          model,
          messages,
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 2000,
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.openrouterKey}`,
            'HTTP-Referer': 'https://careerpilot.local',
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      )
      const text = res.data.choices[0].message.content.trim()
      this.logger.log(`[${role}] ${model} · ${Date.now() - start}ms`)
      return text
    } catch (err) {
      this.logger.warn(`LLM call failed, retrying... ${err.message}`)
      await new Promise(r => setTimeout(r, 2000))
      const res = await axios.post(OPENROUTER_URL, { model, messages }, {
        headers: { Authorization: `Bearer ${this.config.openrouterKey}` },
        timeout: 60000,
      })
      return res.data.choices[0].message.content.trim()
    }
  }

  async callJson<T = Record<string, unknown>>(
    prompt: string,
    role: AgentRole = 'analyst',
    options: { system?: string } = {}
  ): Promise<T> {
    const jsonPrompt = prompt + '\n\nReturn ONLY valid JSON. No markdown fences, no explanation.'
    const text = await this.call(jsonPrompt, role, options)
    const clean = text.replace(/```json|```/g, '').trim()
    try {
      return JSON.parse(clean) as T
    } catch {
      // Second attempt with stricter instruction
      const retry = await this.call(
        `Fix this invalid JSON and return only the corrected JSON:\n${clean}`,
        role
      )
      return JSON.parse(retry.replace(/```json|```/g, '').trim()) as T
    }
  }

  async getEmbedding(text: string): Promise<number[]> {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/embeddings',
      { model: MODELS.embeddings, input: text.slice(0, 8000) },
      {
        headers: { Authorization: `Bearer ${this.config.openrouterKey}` },
        timeout: 30000,
      }
    )
    return res.data.data[0].embedding
  }
}
```

Create `src/intelligence/intelligence.module.ts` that exports LlmService and ConfigService.

Write a simple test in `src/intelligence/llm.service.spec.ts` that mocks axios and verifies:
- callJson strips markdown fences before parsing
- Retries once on first failure
- Uses correct model for each role

Done when: tests pass and `LlmService` can be injected into other modules.

---

════════════════════════════════════════════════════════════════
PROMPT 04 — Supabase service + database schema
════════════════════════════════════════════════════════════════

In the CareerPilot project, create `src/tracking/database.service.ts` that wraps the Supabase client.

First, run this SQL in your Supabase SQL editor to create the schema:

```sql
create extension if not exists vector;

create table if not exists applications (
  id               text primary key,
  job_id           text not null,
  company          text not null,
  title            text not null,
  source           text not null,
  location         text,
  url              text,
  match_score      int,
  company_score    int,
  salary_estimate  text,
  status           text not null default 'found',
  variant_label    text not null default 'A',
  applied_at       timestamptz,
  response_received boolean default false,
  response_at      timestamptz,
  reasoning        text,
  trace_path       text,
  created_at       timestamptz default now()
);

create table if not exists job_embeddings (
  job_id     text primary key,
  title      text,
  company    text,
  source     text,
  embedding  vector(384),
  created_at timestamptz default now()
);
create index if not exists job_embeddings_idx on job_embeddings using ivfflat (embedding vector_cosine_ops);

create or replace view outcome_stats as
  select
    variant_label,
    source,
    case when match_score >= 85 then '85+'
         when match_score >= 70 then '70-84'
         else 'below-70' end as score_band,
    count(*) as total,
    sum(case when response_received then 1 else 0 end) as responses,
    round(100.0 * sum(case when response_received then 1 else 0 end) / nullif(count(*), 0), 1) as response_rate
  from applications
  where status not in ('found', 'scored', 'pending_approval')
  group by variant_label, source, score_band;
```

Now create `src/tracking/database.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ConfigService } from '../common/config'
import { Application, ApplicationStatus, OutcomeStat } from '../common/models'

@Injectable()
export class DatabaseService {
  private client: SupabaseClient
  private readonly logger = new Logger(DatabaseService.name)

  constructor(private config: ConfigService) {
    this.client = createClient(config.supabaseUrl, config.supabaseKey)
  }

  async saveApplication(app: Application): Promise<void> {
    const { error } = await this.client.from('applications').upsert({
      id: app.id,
      job_id: app.job.id,
      company: app.job.company,
      title: app.job.title,
      source: app.job.source,
      location: app.job.location,
      url: app.job.url,
      match_score: app.scored.match_score,
      company_score: app.scored.company_score,
      salary_estimate: app.scored.salary_estimate,
      status: app.status,
      variant_label: app.variant_label,
      reasoning: app.scored.reasoning,
      trace_path: app.trace_path,
    })
    if (error) this.logger.error('saveApplication error', error)
  }

  async updateStatus(id: string, status: ApplicationStatus): Promise<void> {
    const update: Record<string, unknown> = { status }
    if (status === ApplicationStatus.APPLIED) update.applied_at = new Date().toISOString()
    await this.client.from('applications').update(update).eq('id', id)
  }

  async markResponded(id: string): Promise<void> {
    await this.client.from('applications').update({
      response_received: true,
      response_at: new Date().toISOString(),
      status: ApplicationStatus.RESPONDED,
    }).eq('id', id)
  }

  async getSeenJobIds(): Promise<Set<string>> {
    const { data } = await this.client.from('applications').select('job_id')
    return new Set((data ?? []).map((r: { job_id: string }) => r.job_id))
  }

  async getOutcomeStats(): Promise<OutcomeStat[]> {
    const { data } = await this.client.from('outcome_stats').select('*')
    return (data ?? []) as OutcomeStat[]
  }

  async getPendingApprovals(): Promise<Application[]> {
    const { data } = await this.client
      .from('applications')
      .select('*')
      .eq('status', 'pending_approval')
      .order('match_score', { ascending: false })
    return (data ?? []) as unknown as Application[]
  }

  async storeEmbedding(jobId: string, meta: Record<string, string>, embedding: number[]): Promise<void> {
    await this.client.from('job_embeddings').upsert({
      job_id: jobId, ...meta, embedding,
    })
  }

  async findSimilarJobs(embedding: number[], threshold = 0.92): Promise<string[]> {
    const { data } = await this.client.rpc('match_jobs', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 5,
    })
    return (data ?? []).map((r: { job_id: string }) => r.job_id)
  }
}
```

Also create this Supabase RPC function in the SQL editor:

```sql
create or replace function match_jobs(
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table(job_id text, similarity float)
language sql stable
as $$
  select job_id, 1 - (embedding <=> query_embedding) as similarity
  from job_embeddings
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
```

Done when: DatabaseService injects, connects to Supabase, and `getSeenJobIds()` returns without error.

---

════════════════════════════════════════════════════════════════
PROMPT 05 — Seek scraper service
════════════════════════════════════════════════════════════════

In the CareerPilot project, create `src/scrapers/seek.service.ts`.

This service uses Playwright to scrape seek.com.au. Requirements:
- Rotate between 3 User-Agent strings
- Rate limit: minimum 2s between page loads
- Fetch job listing cards from search results
- Fetch full description for each job (separate page load)
- Cap description fetch to first 10 jobs to limit time
- Return Job[] with source = 'seek'
- Never throw — log errors and skip bad cards

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { chromium, Browser, Page } from 'playwright'
import * as crypto from 'crypto'
import { Job } from '../common/models'

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
]

@Injectable()
export class SeekService {
  private readonly logger = new Logger(SeekService.name)
  private browser: Browser | null = null

  private get ua(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({ headless: true })
    }
    return this.browser
  }

  async scrape(keywords: string, location: string, maxResults = 20): Promise<Job[]> {
    const jobs: Job[] = []
    const kwSlug  = keywords.toLowerCase().replace(/\s+/g, '-')
    const locSlug = location.toLowerCase().replace(/\s+/g, '-')
    const url = `https://www.seek.com.au/${kwSlug}-jobs/in-${locSlug}?sortmode=ListedDate`

    this.logger.log(`Scraping Seek: ${url}`)
    const browser = await this.getBrowser()
    const ctx  = await browser.newContext({ userAgent: this.ua, viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(2000)

      const cards = await page.$$('[data-automation="normalJob"]')
      this.logger.log(`Found ${cards.length} cards`)

      for (const card of cards.slice(0, maxResults)) {
        try {
          const title   = await card.$eval('[data-automation="jobTitle"]',   el => el.textContent?.trim() ?? '').catch(() => '')
          const company = await card.$eval('[data-automation="jobCompany"]', el => el.textContent?.trim() ?? '').catch(() => '')
          const loc     = await card.$eval('[data-automation="jobLocation"]',el => el.textContent?.trim() ?? '').catch(() => location)
          const salary  = await card.$eval('[data-automation="jobSalary"]',  el => el.textContent?.trim() ?? '').catch(() => '')
          const href    = await card.$eval('a[data-automation="jobTitle"]',  el => el.getAttribute('href') ?? '').catch(() => '')
          const jobUrl  = href.startsWith('/') ? `https://www.seek.com.au${href}` : href
          const id      = crypto.createHash('md5').update(`${company}${title}`).digest('hex').slice(0, 10)

          if (title && company) {
            jobs.push({ id, title, company, location: loc, url: jobUrl, source: 'seek',
                        description: '', salary_text: salary, scraped_at: new Date() })
          }
          await page.waitForTimeout(300)
        } catch (e) {
          this.logger.warn(`Card parse error: ${e}`)
        }
      }

      // Fetch descriptions for first 10 only
      for (const job of jobs.slice(0, 10)) {
        try {
          await page.goto(job.url, { waitUntil: 'networkidle', timeout: 20000 })
          await page.waitForTimeout(1500)
          const desc = await page.$eval('[data-automation="jobAdDetails"]', el => el.textContent?.trim() ?? '').catch(() => '')
          job.description = desc.slice(0, 3000)
          await page.waitForTimeout(2000)  // rate limit
        } catch (e) {
          this.logger.warn(`Description fetch failed for ${job.company}: ${e}`)
        }
      }
    } finally {
      await ctx.close()
    }

    this.logger.log(`Seek returned ${jobs.length} jobs`)
    return jobs
  }

  async onModuleDestroy() {
    await this.browser?.close()
  }
}
```

Done when: `seekService.scrape('React developer', 'Sydney')` returns at least 1 job with a non-empty description.

---

════════════════════════════════════════════════════════════════
PROMPT 06 — Analyst agent service
════════════════════════════════════════════════════════════════

In the CareerPilot project, create `src/agents/analyst.service.ts`.

This service scores job-candidate fit. It must:
- Call LlmService.callJson with the scoring prompt below
- Use the embedding pre-filter first (skip if cosine similarity < 0.35)
- Run company scoring and salary estimation in parallel with Promise.all
- Save a trace JSON to traces/{job_id}_analyst.json
- Return null for jobs below MIN_MATCH_SCORE threshold

SCORING PROMPT (use this exact template, interpolate at runtime):
```
You are a career analyst. Score how well this candidate matches this job.
Be honest — a false positive wastes resume tailoring effort.

OUTCOME CONTEXT (what's worked recently):
{outcomeContext}

CANDIDATE SKILLS: {skills}
CANDIDATE SUMMARY: {summary}

JOB: {title} at {company}
LOCATION: {location}
DESCRIPTION:
{description}

Return JSON only:
{
  "score": 0-100,
  "reasoning": "2 honest sentences assessing the match",
  "missing": ["skills/keywords the job requires that candidate lacks"],
  "strengths": ["candidate's top 3 matching points for this role"],
  "recommended_angle": "one sentence: what to emphasise in the cover letter",
  "apply": true or false
}

Set apply = true only if score >= {threshold}.
```

COMPANY SCORING PROMPT:
```
Company: {company}
Recent context: {newsSnippet}

Score as an employer 0-100. Consider: growth signals, stability, tech reputation, red flags.
Return JSON: { "score": 0-100, "signal": "growing|stable|uncertain|avoid", "reason": "one sentence" }
```

SALARY PROMPT:
```
Job: {title} in {location}, Australia.
Listed salary text: "{salaryText}"

Parse or estimate salary range. Return JSON:
{ "min": number, "max": number, "currency": "AUD", "period": "annual", "confidence": "listed|estimated" }
```

The trace file must contain: timestamp, job_id, embed_score, llm_score, model_used, latency_ms, full analysis result.

Done when: analystService.analyseJob(job, resume, '') returns a ScoredJob with score, reasoning, and missing fields populated.

---

════════════════════════════════════════════════════════════════
PROMPT 07 — Writer agent service
════════════════════════════════════════════════════════════════

In the CareerPilot project, create `src/agents/writer.service.ts`.

This service tailors resumes and writes cover letters. Two methods required:

METHOD 1: tailorResume(job, scored, resume, variant)
- Variant A: lead with technical depth, reorder bullets to surface senior/complex work first
- Variant B: lead with shipped products and outcomes, surface impact metrics first
- Save output to output/{job_id}/resume_variant_{A|B}.json
- Save trace to traces/{job_id}_writer_{variant}.json
- Return the tailored resume object

RESUME TAILORING PROMPT (use exactly):
```
You are a professional resume writer. You reframe, never invent.

MASTER RESUME (JSON):
{resumeJson}

JOB: {title} at {company}
DESCRIPTION: {description}
WHAT TO EMPHASISE: {recommendedAngle}
MISSING KEYWORDS TO ADDRESS: {missing}
VARIANT STRATEGY: {variantInstruction}

Variant A instruction: "Reorder to surface deepest technical work first. Lead summary with years and tech stack depth."
Variant B instruction: "Reorder to surface shipped products and measurable outcomes first. Lead summary with what you've built and delivered."

RULES:
1. Rewrite summary (2-3 sentences) targeting this role at this company specifically.
2. Reorder experience bullets within each role by relevance to this job.
3. Incorporate missing keywords naturally where honestly applicable — do not invent.
4. Return the COMPLETE resume as valid JSON in the EXACT same schema as the input.
5. Add a "changes_made": ["list"] field documenting your changes.

Return ONLY valid JSON. No markdown, no explanation.
```

METHOD 2: writeCoverLetter(job, scored, resume)
- Under 220 words
- 3 paragraphs: specific hook, two achievements, confident close
- No "I am excited to apply" opener
- Plain text only

COVER LETTER PROMPT:
```
Write a cover letter for {name} applying to {title} at {company}.

3 paragraphs, max 220 words total:
P1: One-sentence hook referencing something specific about {company}. Why this role.
P2: Two concrete achievements from the resume that directly address the role's needs.
P3: Confident close. Call to action. No begging.

CANDIDATE HIGHLIGHTS:
{topBullets}

JOB FOCUS: {recommendedAngle}
WHAT THE JOB NEEDS: {strengths joined}

RULES:
- Never start with "I am excited/thrilled/pleased to apply"
- No filler: "I believe", "I feel", "I am passionate about"
- Confident and specific. Sound like a senior engineer, not a job applicant.
- Plain text only. No headers, no bullets, no markdown.

Return the letter text ONLY.
```

Save everything to output/{job_id}/ folder. Create the folder if it doesn't exist.

Done when: writerService.tailorResume returns valid JSON matching MasterResume schema, and writeCoverLetter returns a string under 300 words.

---

════════════════════════════════════════════════════════════════
PROMPT 08 — Scout agent service
════════════════════════════════════════════════════════════════

In the CareerPilot project, create `src/agents/scout.service.ts`.

This service orchestrates job discovery across sources.

Requirements:
- Inject SeekService (and later LinkedInService when built)
- For each role × location combination, call each scraper
- Check results against DatabaseService.getSeenJobIds() — skip already-seen job IDs
- Apply semantic dedup: embed each new job title+company, query Supabase for similarity > 0.92, skip if found
- Rate limit: 3s gap between source calls
- Return deduplicated Job[] with stats object

```typescript
// Scout output shape
interface ScoutResult {
  jobs: Job[]
  stats: {
    source: string
    found: number
    deduped: number
  }[]
}
```

Log each step: source name, jobs found, jobs after dedup.

Done when: scoutService.run(['React developer'], ['Sydney']) returns ScoutResult with at least 1 job.

---

════════════════════════════════════════════════════════════════
PROMPT 09 — Coordinator service (pipeline brain)
════════════════════════════════════════════════════════════════

In the CareerPilot project, create `src/agents/coordinator.service.ts`.

This is the main pipeline orchestrator. It must inject and call all other agent services in order.

PIPELINE STEPS (implement in this exact order):
1. Load master resume from data/resume.json
2. Call DatabaseService.getOutcomeStats() → build outcome context string
3. Call ScoutService.run(roles, locations)
4. Prioritise jobs: sort by (title keyword match to resume skills) descending
5. For each job (up to max 50): call AnalystService.analyseJob() with 5 concurrent max
   - Use Promise.allSettled with concurrency limiter
   - Sleep 1s between LLM calls
6. Filter: keep only ScoredJobs where match_score >= config.minScore
7. Sort qualified: match_score × (company_score ?? 50) descending
8. Cap to config.maxDailyApps
9. For each qualified job:
   a. Determine variant: alternate A/B based on index
   b. Call WriterService.tailorResume + writeCoverLetter
   c. Create Application object, save to DB with status PENDING
   d. If notifyCallback provided: send approval message
   e. If approvalCallback provided: await response, skip if false
   f. If approved (or AUTO_APPLY=true): call ExecutorService.execute()
10. Call notifyCallback with final summary

OUTCOME CONTEXT PROMPT:
```
Analyse these job application outcomes and identify patterns:
{outcomeStatsJson}

Return JSON:
{
  "best_source": "seek|linkedin|indeed",
  "best_score_band": "85+|70-84|below-70",
  "best_variant": "A|B|insufficient_data",
  "avoid_patterns": ["any patterns to deprioritise"],
  "strategy_note": "one sentence recommendation for today's run"
}
Return { "best_source": "seek", "best_score_band": "70-84", "best_variant": "A", "avoid_patterns": [], "strategy_note": "No data yet, run normally." } if no data exists.
```

Also implement: `buildApprovalMessage(app: Application): string` — formats a Discord-ready message with title, company, score, salary, reasoning, and URL.

Done when: coordinatorService.run({ roles: ['React developer'], locations: ['Sydney'] }) completes without error and saves at least 1 application to Supabase.

---

════════════════════════════════════════════════════════════════
PROMPT 10 — Excel tracker service
════════════════════════════════════════════════════════════════

In the CareerPilot project, create `src/tracking/excel.service.ts` using the `exceljs` library.

Requirements:
- File path: data/applications.xlsx
- Create file + headers + bold formatting on first run
- Append one row per application with these columns in order:
  Date | Company | Title | Source | Location | Match Score | Company Score | Salary Estimate | Status | Variant | URL | Reasoning | Responded
- Color code rows by status:
  applied    → light green  (#D4EDDA)
  responded  → light blue   (#CCE5FF)
  interview  → light yellow (#FFF3CD)
  rejected   → light red    (#F8D7DA)
  manual     → light orange (#FDEBD0)
  other      → white
- Method: appendRow(app: Application, status: ApplicationStatus): Promise<void>
- Method: updateStatus(company: string, status: ApplicationStatus): Promise<void>
  → finds the most recent row matching company name, updates Status and Responded columns
- Method: getFilePath(): string → returns absolute path for Discord file attachment

Done when: two appendRow calls produce a valid .xlsx with 2 data rows, correct colors, and bold headers.

---

════════════════════════════════════════════════════════════════
PROMPT 11 — Discord bot service
════════════════════════════════════════════════════════════════

In the CareerPilot project, create `src/discord/discord.service.ts` using discord.js v14.

Implement these slash commands:

/run [keywords] [location]
  - Defer response (long operation)
  - Call CoordinatorService.run() with notify + approval callbacks
  - notifyCallback: send message to configured channel
  - approvalCallback: send approval embed + wait for button click (60s timeout, default skip)
  - Reply with final stats embed when done

/status
  - Call DatabaseService.getOutcomeStats()
  - Reply with formatted table: variant | source | score_band | response_rate | total

/jobs
  - Call DatabaseService.getPendingApprovals()
  - Send one embed per pending job (max 5)
  - Each embed has Apply ✅ and Skip ⏭ buttons
  - Button handlers update status in DB

/report
  - Call ExcelService.getFilePath()
  - Attach the .xlsx file as a Discord attachment

/responded [company]
  - Call DatabaseService.markResponded() for most recent application from that company
  - Confirm with a checkmark message

APPROVAL EMBED format:
```
Title: "{job.title} at {job.company}"
Color: green if score>=85, amber if score>=70, red otherwise
Fields:
  Match Score  | {score}/100         (inline)
  Company      | {companyScore}/100  (inline)
  Salary       | {salaryEstimate}    (inline)
  Source       | {source}            (inline)
  Reasoning    | {reasoning}
  URL          | {url}
```

The approval flow uses an asyncio-style pattern in Node:
- Store a Promise resolve function in a Map keyed by application ID
- Button click resolves the Promise
- Await with a 60s timeout using Promise.race

Register all slash commands on bot ready with guild.commands.set().

Done when: /run command triggers the full pipeline and posts an approval embed for the first qualified job.

---

════════════════════════════════════════════════════════════════
PROMPT 12 — Scheduler service
════════════════════════════════════════════════════════════════

In the CareerPilot project, create `src/scheduler/scheduler.service.ts`.

Use @nestjs/schedule with two scheduled tasks:

TASK 1: Daily job run
- Cron: '0 9 * * 1-5' (9am weekdays)
- Call CoordinatorService.run() with default config from .env
- Post start + completion messages to Discord channel
- Catch errors, post error message to Discord rather than crashing

TASK 2: Stale application checker
- Cron: '0 10 * * 1' (10am Mondays)
- Find applications with status='applied' and applied_at older than 14 days
- Update their status to 'ghosted'
- Post summary to Discord: "Marked X applications as ghosted (>14 days no response)"

Also expose a manual trigger method: triggerRun(roles?, locations?) for the /run Discord command to call.

Done when: scheduler starts, logs the next scheduled run time, and manual trigger works.

---

════════════════════════════════════════════════════════════════
PROMPT 13 — App module wiring
════════════════════════════════════════════════════════════════

In the CareerPilot project, update `src/app.module.ts` to wire all modules together.

Create these modules with proper imports and exports:
- IntelligenceModule (exports: LlmService, EmbeddingsService, CompanyService, SalaryService)
- ScrapersModule (exports: SeekService)
- TrackingModule (exports: DatabaseService, ExcelService)
- AgentsModule (imports: IntelligenceModule, ScrapersModule, TrackingModule — exports: CoordinatorService)
- DiscordModule (imports: AgentsModule, TrackingModule)
- SchedulerModule (imports: AgentsModule, DiscordModule)

AppModule imports all of the above plus:
- ConfigModule.forRoot({ isGlobal: true })
- ScheduleModule.forRoot()

main.ts should:
- Create NestJS app
- Set global validation pipe
- Start on port 3001 (not 3000, reserved for dashboard)
- Log startup message with configured roles and locations

Done when: `npm run start:dev` starts all modules, registers Discord slash commands, and logs "CareerPilot ready".

---

════════════════════════════════════════════════════════════════
PROMPT 14 — Next.js dashboard
════════════════════════════════════════════════════════════════

Create a Next.js 14 app in the `dashboard/` folder using TypeScript and Tailwind CSS.
It reads directly from Supabase — no separate API layer needed.

```bash
npx create-next-app@latest dashboard --typescript --tailwind --app --no-src-dir
cd dashboard
npm install @supabase/supabase-js recharts @tanstack/react-table
```

Create these pages/components:

PAGE: app/page.tsx — main dashboard
Shows 4 metric cards at top:
  - Total applied (count where status='applied')
  - Response rate (% where response_received=true)
  - Interviews (count where status='interview')
  - Best variant (A or B based on response_rate from outcome_stats view)

Then 3 charts using recharts:
  1. Application funnel BarChart — x=status, y=count
  2. A/B test comparison BarChart — x=variant_label, y=response_rate, two bars side by side
  3. Score band performance BarChart — x=score_band, y=response_rate

Then a table of last 20 applications:
  Company | Title | Score | Source | Status (color badge) | Applied date | Salary | URL link

PAGE: app/traces/[jobId]/page.tsx — trace viewer
  - Reads traces/{jobId}_analyst.json and traces/{jobId}_writer_A.json from Supabase Storage
  - Displays: embed score, llm score, reasoning, missing keywords, cover letter preview
  - Back button to main dashboard

COMPONENT: components/StatusBadge.tsx
  - applied → green, responded → blue, interview → yellow, rejected → red, manual → orange

Create dashboard/.env.local:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Deploy with: `npx vercel --prod` (Vercel free tier, no config needed for Next.js)

Done when: dashboard loads, shows real data from Supabase, all 3 charts render.

---

════════════════════════════════════════════════════════════════
PROMPT 15 — Feedback loop integration
════════════════════════════════════════════════════════════════

In the CareerPilot project, update CoordinatorService to fully implement the feedback loop.

The feedback loop must:

1. After getOutcomeStats(), call LlmService.callJson with the OUTCOME CONTEXT PROMPT (from Prompt 09)
2. Store the result as: outcomeContext: { best_source, best_score_band, best_variant, avoid_patterns[], strategy_note }
3. Pass strategy_note to the Analyst's scoring prompt as the OUTCOME CONTEXT field
4. Adjust Scout priority: if best_source is known, run that source first and increase its maxResults by 50%
5. Adjust Writer variant selection: if best_variant is A or B (not insufficient_data), use that variant for 70% of applications instead of strict alternation
6. Log the strategy decision to Discord at start of each run: "Today's strategy: {strategy_note}"

Add a new Discord command /strategy that shows the current outcome stats table + today's strategy note without triggering a run.

Also add a weekly summary report (cron: '0 9 * * 1' — Monday 9am):
- Total applications last 7 days
- Response rate last 7 days vs previous 7 days (trend arrow up/down)
- Best performing variant this week
- Top 3 companies that responded
- Post as a formatted embed to Discord

Done when: after marking 2+ applications as responded, the coordinator's next run shows a different strategy_note than "No data yet, run normally."

---

════════════════════════════════════════════════════════════════
PROMPT 16 — Final: OpenClaw skill file
════════════════════════════════════════════════════════════════

Create a file called `openclaw-skills/seek_job_scout/SKILL.md` in the CareerPilot repo.

This is a publishable OpenClaw skill for the ClawHub marketplace.
It enables OpenClaw to run the CareerPilot job search without the NestJS backend.

The skill file should:
1. Describe what the skill does in one paragraph
2. List exact step-by-step instructions OpenClaw's agent will follow:
   a. Open seek.com.au in browser
   b. Search for {keywords} in {location}
   c. Collect job listings: title, company, salary, URL (up to 20)
   d. For each job, open URL and collect description
   e. Score each job against the user's resume stored in ~/careerpilot/data/resume.json
   f. For jobs scoring >= 65, tailor the resume using the master resume
   g. Write tailored resume to ~/careerpilot/output/{company}_{title}/resume.json
   h. Write cover letter to ~/careerpilot/output/{company}_{title}/cover_letter.txt
   i. Append row to ~/careerpilot/data/applications.xlsx
3. List required user configuration (resume.json location, OpenRouter key)
4. List output files produced
5. Include usage examples:
   - "Find React developer jobs in Sydney"
   - "Search for remote Python engineer roles in Australia"
6. Add a CONFIGURATION section for OpenRouter key setup
7. Include a LIMITATIONS section (Computer Use required, AU market only, no auto-submit)

Format it as clean Markdown suitable for the ClawHub marketplace README.

Done when: the skill file is clear enough that a non-technical user could follow it to set up CareerPilot via OpenClaw.
```
