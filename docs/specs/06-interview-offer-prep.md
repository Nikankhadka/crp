# 06 - Interview and offer prep

## Purpose

Pillar (c): an interview log whose carry-forward lessons feed the next prep, stage/format-aware prep
grounded in the fact ledger and evidence, metrics defense, and negotiation setup.

## Scope

Table `interview_log_entries`; the prep service and prompt; carry-forward injection; the debrief; the
negotiation section; storage of prep output as a `prep_sheet` material version.

## Non-goals

Coding-practice sandboxes, live mock interviews, third-party course content, spoken-answer scoring.

## Context

`docsStore` has an `interview` category, but docs are background only and never a fact source
(`src/server/docsStore.ts:3`, `prompts/base/system.md:7`). The owner's interview log format exists in
`seed/me/job-search-vertical.md:231-487` (snapshot, what happened, went well, broke down,
carry-forward checklist). The prep system prompt is lines 61-230 and the prep pipeline (E5) is lines
670-687. Metrics must be defended from the engineering context with hedges intact
(`seed/me/job-search-vertical.md:1476-1480`).

## User stories

- As a user, after an interview I log the outcome and carry-forward items.
- As a user, given JOB, STAGE and FORMAT, I get predicted questions and structured answers grounded
  in my facts and evidence, with metrics defenses and follow-ups.
- As a user, before an offer I get a negotiation script and non-base levers.

## Functional requirements

- FR-1 Interview log entry per application: stage, format, date, what happened, went well, broke
  down, carry-forward list.
- FR-2 Carry-forward items from the same user's prior entries surface in the next prep run as
  `priorLessons`.
- FR-3 Prep input: application (JOB), `stage`, `format`. Output: a pipeline map, predicted
  questions, each with a structured answer (STAR or equivalent), a plain-language version, a metrics
  defense (how measured, what it does not claim, the caveat first), and follow-up questions.
- FR-4 Every metric in an answer cites a fact id from `07` and keeps its hedge verbatim.
- FR-5 Gap drill: for each JD-named requirement the bank or facts do not evidence, produce "Have not
  shipped X in production. Closest is Y. Here is how I would approach X."
- FR-6 Their questions: 8-10 questions unanswerable from the public site.
- FR-7 Negotiation: a script, a lowball response, and non-base levers. Market data is user-supplied
  or explicitly marked unverified; no guessed figures.
- FR-8 Store the prep sheet as a `material_versions` row with `kind = 'prep_sheet'`.

## Data model changes

```sql
-- 010_interview_log
create table interview_log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  stage text not null default '',
  format text not null default '',
  happened_on date,
  what_happened text not null default '',
  went_well text not null default '',
  broke_down text not null default '',
  carry_forward text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index interview_log_app_idx on interview_log_entries (application_id, happened_on desc);
```

## API contract

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/applications/[id]/interviews` | none | `{ entries }` |
| POST | `/api/applications/[id]/interviews` | `{ stage, format, happenedOn?, whatHappened, wentWell, brokeDown, carryForward[] }` | 201 `{ entry }` |
| POST | `/api/applications/[id]/prep` | `{ stage, format }` | 202 `{ version }` |
| GET | `/api/applications/[id]/carry-forward` | none | `{ items }` |

Status codes: 400 bad input; 401 no session; 404 not this user's; 422 validator failure; 502 provider
failure with a fixed message.

Handlers are thin adapters over the shared service layer `src/server/api.ts` (`02` `FR-8`); the prep
and carry-forward logic lives in the service so HTTP and `09` over MCP share one path.

## UI surfaces

- Application detail tab "Interview".
- Prep viewer with sections (pipeline map, behavioural, technical, their questions, negotiation) and
  per-answer copy buttons.
- Interview log form mirroring the owner's template.
- `/interviews` index across all applications.
- Nav link "Interviews".

## Rules and invariants

- Prep answers may cite only facts and evidence the user owns; hedges are preserved (`07`).
- Unverified facts and open verification items are withheld and flagged, not used.
- Market salary is never invented; unknown is stated as unknown.
- The interview log is never used as a fact source for the resume; only carry-forward lessons feed
  prep.
- Every prep run is scoped to `user_id`; another user's entries never appear.

## Acceptance criteria

```
AC-1 Given two logged entries with carry-forward items When prep runs Then priorLessons contains
     both.
AC-2 Given a fact with hedge 'an estimated 70%+' When an answer cites it Then the hedge appears
     within the same sentence as the number and the validator confirms it.
AC-3 Given a JD requirement absent from facts and evidence When prep runs Then a gap drill appears
     and no fabricated experience does.
AC-4 Given an open verification item linked to a fact When prep would use that fact Then the fact is
     flagged and excluded from the answers.
AC-5 Given user B's interview entry When user A lists Then [].
AC-6 Given prep output When stored Then a material_versions row kind=prep_sheet exists for the
     application.
AC-7 Given no market data supplied When negotiation is generated Then it states that no verified
     market figure is available rather than inventing one.
```

## Test cases

```
TC-1 | store | file: test/interviewStore.test.ts (new)
Given entries for A When listEntries(B, applicationId) Then [].
TC-2 | core | file: test/prep.test.ts (new)
Given mocked llm output and a bank with a hedged fact When prep validates Then the hedge rule
passes; given an invented number Then it retries once and then throws, mirroring src/core/tailor.ts.
TC-3 | route | file: test/prep-routes.test.ts (new)
Given signInAs A When POST prep Then 202 and a prep_sheet version exists.
TC-4 | core | file: test/carry-forward.test.ts (new)
Given two entries When prep input is built Then both carry-forward sets are present.
TC-5 | core | file: test/prep.test.ts
Given an open verification item When building prep input Then the linked fact is excluded.
```

## Edge cases

- No prior entries; priorLessons is empty.
- Application with no facts or evidence; gap drills for every requirement.
- Empty stage or format; default to a phone-screen assumption stated inline.
- A verification item resolved mid-run; the run uses the snapshot at start.
- Negotiation with no market data; state unknown.

## Out of scope

Live practice, scoring of spoken answers, external question banks, offer-letter parsing, salary
prediction.

## Dependencies

`01`, `03` (the application the prep belongs to), `05` (prep is stored as a `prep_sheet` material
version), and `07` (facts, evidence, hedges and the verification queue).

`08` consumes this spec at step E5; it does not block it.

## How this beats ResuMax

Prep is grounded in the user's own fact ledger and evidence with hedge-preserving metrics defense and
per-requirement gap drills, not a generic content library, and negotiation never invents market
figures. No usage caps.
