# 08 - Conversation pipeline (E0-E7)

## Purpose

Pillar (f, engine): one conversation equals one application. Run the E0-E7 stages, each with a
confirmation gate, with the rules layer as a hard validator and the three-layer model as the only
source of facts.

## Scope

Tables `pipeline_runs`, `pipeline_steps`; the LLM tasks and zod schemas for triage, intel, change log,
cover letter, outreach, interview prep, evidence pack, form fields and debrief; the step runner and
confirmation gate.

## Non-goals

A free-form chat thread; multi-job conversations; auto-running the full chain; auto-apply or
messaging employers.

## Context

The owner's MoE prompt (`seed/me/job-search-vertical.md:488-731`) defines the stages, the FILE
HIERARCHY (evidence, facts, instructions, external surfaces), the non-negotiables, and the default
`E0 -> E1 -> E2` then offer E3/E4. The app today has score, tailor and import only
(`src/core/score.ts`, `src/core/tailor.ts`, `src/core/import.ts`). Tailoring already does a
validate-then-guard-retry loop (`src/core/tailor.ts:45-69`), which the step runner mirrors.

## User stories

- As a user, I paste a JD or URL and get a JOB BRIEF with a verdict before anything is tailored.
- As a user, each stage shows its output and waits for my confirmation before the next.
- As a user, the pipeline reuses my rules layer and never fabricates.

## Functional requirements

- FR-1 Create a pipeline run for an application; `inputs` capture JD, URL, stage and format.
- FR-2 E0 triage: extract title, company, team, location, employment type, hard requirements,
  nice-to-haves, stack, seniority signals and salary band; evaluate knockouts (citizenship, PR,
  clearance, minimum years, salary floor, location, Known-Gap hard requirements); score domain,
  stack and seniority fit; verdict `apply | apply_with_caveat | pass`; stack fit under about 50%
  needs an explicit bridge or PASS; 3+ hard Known-Gap requirements stated plainly.
- FR-3 E1 intel: company and role research through an injectable research dependency (state
  "research unavailable" when none is configured), red and green flags, and the strongest angle plus
  the keywords that feed later documents.
- FR-4 E2 resume: a change log against the master (added, removed, restructured plus why); plain
  text on confirm; a material version created (`05`); DOCX or PDF only after explicit confirmation.
- FR-5 E3 cover letter: 150-300 words, evidence-led, no contractions, no em dashes, no first-person
  opening, one specific company reference, one honest gap sentence where a hard requirement is a
  known gap; stored as a `cover_letter` version.
- FR-6 E4 outreach: contact map plus a hiring-manager message, a peer message, and two recruiter
  reply variants with the visa line (recruiter and form fields only, never the resume); LinkedIn
  connection note under 300 characters.
- FR-7 E5 interview prep delegates to `06`; E6 evidence pack assembles evidence records and links
  for the role; E7 form fields answer screening and salary fields using facts and the visa line
  once; the debrief records the outcome and carry-forward.
- FR-8 Confirmation gate: a step reaches `awaiting_confirmation`; only a confirm carrying the current
  `output_hash` advances; editing the step output invalidates the confirmation.
- FR-9 Rules layer: every outgoing output passes `rulesGuard` (`07`) and `guard` (`src/core/
  guard.ts`) before `confirmed`; failures surface with the violation list and one retry.
- FR-10 The instructions layer is the system prompt; facts and evidence are the only fact sources;
  `<docs>` remain background reference only (`prompts/base/system.md:7`).
- FR-11 Ask a question only when the answer changes the output; otherwise proceed and state the
  assumption inline. Questions are a `questions` array on the step output, not free chat.

## Data model changes

```sql
-- 012_pipeline_runs
create table pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  current_step text not null default 'E0'
    check (current_step in ('E0','E1','E2','E3','E4','E5','E6','E7','done')),
  status text not null default 'open' check (status in ('open','awaiting_confirmation','done','error')),
  inputs jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pipeline_runs_app_idx on pipeline_runs (application_id, created_at desc);

create table pipeline_steps (
  run_id uuid not null references pipeline_runs (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  step text not null,
  status text not null default 'pending'
    check (status in ('pending','running','awaiting_confirmation','confirmed','skipped','error')),
  output jsonb,
  output_hash text,
  error text,
  confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (run_id, step)
);
```

Prompts to add under `prompts/base/`: `triage.md`, `intel.md`, `change_log.md`, `cover_letter.md`,
`outreach.md`, `interview_prep.md`, `debrief.md`, `form_fields.md`. Core modules:
`src/core/{triage,intel,changeLog,coverLetter,outreach,prep}.ts`, each exporting a schema and a
function that follows the validate-then-validate-again pattern of `src/core/tailor.ts`.

## API contract

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/applications/[id]/pipeline` | `{ jd?, url?, stage?, format? }` | 201 `{ run }` |
| GET | `/api/pipeline/[runId]` | none | `{ run, steps }` |
| POST | `/api/pipeline/[runId]/steps/[step]/run` | `{ inputs? }` | 202 `{ step }` |
| POST | `/api/pipeline/[runId]/steps/[step]/confirm` | `{ outputHash }` | `{ step, run }` or 409 |
| POST | `/api/pipeline/[runId]/steps/[step]/skip` | none | `{ step, run }` |

Status codes: 400 bad input; 401 no session; 404 not this user's; 409 stale output hash; 422 guard or
rules violations with `{ error, violations }`; 502 provider failure with a fixed message.

Running a step follows the existing `after()` plus durable-worker pattern from `02` so a long step is
leased and retried. Handlers are thin adapters over the shared service layer `src/server/api.ts`
(`02` `FR-8`), and the step runner is a service function, so `09` can start a run or advance a step
to `awaiting_confirmation` over MCP without a second implementation.

## UI surfaces

- `/applications/[id]` "Pipeline" tab: a step rail E0-E7 with status, each step's structured output,
  a confirm or skip control, and inline questions when an answer changes the output.
- Reuse the polling pattern from `src/components/JobDetail.tsx:40-68` for running steps.

## Rules and invariants

- No stage auto-runs past its gate; the default is E0 then E1 then E2, then offer E3 and E4.
- Facts and evidence only; `<docs>` are background only; the visa line never enters the resume or
  cover letter.
- Every outgoing bullet and number cites a bank or fact id and keeps its hedge.
- No prompt contains occupation-specific vocabulary.
- Interview prep reuses `06`; material creation reuses `05`; the pipeline owns orchestration only.
- A confirmed step is immutable; a later rules change that alters the output hash reopens the step.

## Acceptance criteria

```
AC-1 Given a JD with a citizenship requirement When E0 runs Then the verdict is PASS and the gate is
     listed first in the brief.
AC-2 Given E0 confirmed When E1 runs Then E0 output is unchanged and E1 is awaiting_confirmation.
AC-3 Given E2 awaiting_confirmation When confirm with a stale outputHash Then 409 and no advance.
AC-4 Given generated cover-letter text that invents a metric When confirm Then 422 with rulesGuard
     and guard violations and the step stays awaiting_confirmation.
AC-5 Given 3+ hard requirements from Known Gaps When E0 runs Then the brief states this plainly and
     the verdict is apply_with_caveat or pass.
AC-6 Given user B's run id When user A reads or confirms Then 404.
AC-7 Given no research provider configured When E1 runs Then the output states research is
     unavailable and no fabricated company facts appear.
AC-8 Given a step that throws When the worker retries and then succeeds Then the step reaches
     awaiting_confirmation, not error.
```

## Test cases

```
TC-1 | pipeline | file: test/pipeline.test.ts (new)
Given injected LLM deps for each step When the runner advances Then status transitions match and
running a step twice before confirmation is idempotent.
TC-2 | core | file: test/triage.test.ts (new)
Given a JD with a clearance gate When triage parses Then the verdict is pass and the knockout is
present.
TC-3 | core | file: test/step-validators.test.ts (new)
Given an invented number in an E3 body When validateStep runs Then a guard violation returns and a
retry is attempted once, mirroring src/core/tailor.ts.
TC-4 | route | file: test/pipeline-routes.test.ts (new)
Given no session Then 401; given A's run When B confirms Then 404.
TC-5 | store | file: test/pipelineStore.test.ts (new)
Given a run for A When listRuns(B, applicationId) Then [].
TC-6 | pipeline | file: test/pipeline.test.ts
Given a stale outputHash When confirm Then 409 and the step does not advance.
```

## Edge cases

- JD as a URL with discovery unconfigured; state the limitation and fall back to pasted text.
- Research unavailable; state it, do not invent.
- Partial JD; the score cap of 75 applies and is recorded.
- A step retried after a provider error; attempt counting comes from `02`.
- A confirmed step whose upstream rules changed; the hash mismatch reopens the step.
- E5 with no prior interview log; priorLessons is empty.
- E3 output outside the 150-300 word range; warn and allow a re-run.

## Out of scope

A general chat thread, multi-job conversations, autonomous run of all stages, auto-apply, messaging
employers, voice or live interview practice.

## Dependencies

`03`, `05`, `06`, `07`; an optional research provider for E1.

## How this beats ResuMax

Full-funnel parity with an explicit, inspectable stage machine and a confirmation gate at every step,
grounded in a local rules layer, with no mass auto-apply and no paid usage caps.
