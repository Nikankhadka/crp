# 07 - Three-layer rules

## Purpose

Pillar (f, data): the fact layer (fact ledger), the evidence layer (engineering context with
failures and scope limits), and the rules layer (DO NOT CLAIM register, standing corrections,
eligibility gates, verification queue), with pure code validators reused by score, tailor, import,
prep and outreach.

## Scope

Tables `facts`, `evidence_records`, `claims`, `verification_items`; the new validator
`src/core/rules.ts` (`rulesGuard`); prompt injection of the rules layer; the `/rules` UI.

## Non-goals

The staged pipeline (`08`); rendering; automatic resolution of verification items from the web.

## Context

Facts currently live as free-form bank bullets (`src/core/bank.ts`) and metrics carry hedges only in
prose (`seed/me/personal.md:24`). The DO NOT CLAIM register is prose (`seed/me/personal.md:28-35`)
and is partly wired as `neverMention` in `src/core/guard.ts:21-25,110-121,178-187`. The verification
queue is prose (`seed/me/personal.md:42-45`). Import already grounds numbers against resume text
(`src/core/import.ts:88-96`). The owner's accuracy rules, standing corrections and metric-defense
notes are in `seed/me/job-search-vertical.md:1451-1480`.

## User stories

- As a user, I maintain one fact ledger; every outgoing number traces to it with its hedge.
- As a user, I maintain engineering context with failures and scope limits.
- As a user, I keep a DO NOT CLAIM register and a verification queue that hard-block outgoing
  material.

## Functional requirements

- FR-1 Fact CRUD: `statement`, `value`, `hedge`, `confidence (stated|estimated|unverified)`,
  `source`, `status (active|verify|retired)`, `tags[]`, `linked_ids[]`; user-scoped text id.
- FR-2 Evidence CRUD: `project`, `summary`,
  `body { whatBuilt, hardPart, failures[], scopeLimits[], decisions[] }`, `tags[]`; user-scoped text
  id.
- FR-3 Claim CRUD: `kind in (do_not_claim, standing_correction, eligibility_gate)`, `term`, `reason`,
  `correction`.
- FR-4 Verification items: `open|resolved|dropped`, linked to a fact or evidence id, optionally an
  application.
- FR-5 `rulesGuard(text, ctx)` returns violations:
  - `inventedNumber`: an outgoing number not present in any active fact value and not present in the
    cited bank source;
  - `doNotClaim`: a `do_not_claim` term appears in outgoing text;
  - `withheld`: the value of a `verify` fact or of a fact with an open verification item appears in
    outgoing text;
  - `hedgeMissing`: a number sourced from a fact appears without that fact's `hedge` in the same
    sentence.
- FR-6 The rules layer is injected into the personal layer at prompt build time: `neverMention` from
  `do_not_claim`, a withholding list from open verification items, and standing corrections as
  overrides. `buildPrompt` (`src/core/prompt.ts`) stays pure string assembly.
- FR-7 Eligibility gates (`citizenship`, `pr`, `clearance`) force a knockout in triage (`08`) and
  appear in the score red flags.
- FR-8 Import derives draft facts from a bank and flags numbers that lack a fact; it never invents a
  number absent from the resume text.
- FR-9 The `/rules` UI manages all four registers; a fact can list the bank bullet ids it backs.

## Data model changes

```sql
-- 007_three_layer
create table facts (
  id text not null,
  user_id uuid not null references users (id) on delete cascade,
  statement text not null,
  value text,
  hedge text,
  confidence text not null default 'stated' check (confidence in ('stated','estimated','unverified')),
  source text,
  status text not null default 'active' check (status in ('active','verify','retired')),
  tags text[] not null default '{}',
  linked_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index facts_user_status_idx on facts (user_id, status);

create table evidence_records (
  id text not null,
  user_id uuid not null references users (id) on delete cascade,
  project text not null,
  summary text not null default '',
  body jsonb not null default '{}',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  kind text not null check (kind in ('do_not_claim','standing_correction','eligibility_gate')),
  term text not null,
  reason text not null default '',
  correction text,
  created_at timestamptz not null default now()
);
create index claims_user_kind_idx on claims (user_id, kind);

-- 008_verification_items
create table verification_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  application_id uuid references applications (id) on delete cascade,
  fact_id text,
  evidence_id text,
  question text not null,
  status text not null default 'open' check (status in ('open','resolved','dropped')),
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index verification_user_status_idx on verification_items (user_id, status);
```

## API contract

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/facts` | none | `{ facts }` |
| POST | `/api/facts` | fact fields | 201 `{ fact }` |
| PATCH | `/api/facts/[id]` | partial | `{ fact }` |
| DELETE | `/api/facts/[id]` | none | `{ ok: true }` |
| GET | `/api/evidence` | none | `{ records }` |
| POST | `/api/evidence` | evidence fields | 201 `{ record }` |
| PATCH | `/api/evidence/[id]` | partial | `{ record }` |
| DELETE | `/api/evidence/[id]` | none | `{ ok: true }` |
| GET | `/api/claims` | none | `{ claims }` |
| POST | `/api/claims` | `{ kind, term, reason?, correction? }` | 201 `{ claim }` |
| DELETE | `/api/claims/[id]` | none | `{ ok: true }` |
| GET | `/api/verification` | query `status?` | `{ items }` |
| POST | `/api/verification` | `{ factId?, evidenceId?, applicationId?, question }` | 201 `{ item }` |
| POST | `/api/verification/[id]/resolve` | `{ resolution }` | `{ item }` |

Status codes: 400 invalid kind/field; 401 no session; 404 not this user's; 409 duplicate fact id.

Handlers are thin adapters over the shared service layer `src/server/api.ts` (`02` `FR-8`).
`rulesGuard` is a pure function in `src/core/rules.ts` with no store or user scoping, so every
consumer (`05`, `06`, `08`, and the existing score, tailor and import flows) validates the same way
and the `07` tables are read once per run into an immutable rules context.

## UI surfaces

- `/rules` page with four tabs: Facts, Evidence, Claims, Verification.
- Fact editor with value, hedge, confidence, status and linked bank ids.
- Evidence editor with sections for what built, hard part, failures, scope limits, decisions.
- Verification queue with a "withheld from outgoing" badge and a resolve action.
- Nav link "Rules".

## Rules and invariants

- Outgoing material (resume, cover letter, outreach, form answers, prep) is validated by
  `rulesGuard` before approval.
- A `verify` fact or an open verification item is withheld, not silently dropped; the user is told.
- The claims table is authoritative over prose; the prompt personal layer is generated from it at run
  time. Migrating the existing `personal.md` register into rows is part of this phase.
- A hedge travels with its number: never burn or relocate a hedge.
- Number parsing reuses `guard.numbers` (`src/core/guard.ts:47-51`) so decimals, percent and suffix
  are handled consistently.
- The rules layer never introduces an occupation-specific prompt term; it only supplies data.

## Acceptance criteria

```
AC-1 Given a fact '70%+' with hedge 'an estimated', status active When outgoing text says '70%
     growth' without the hedge Then rulesGuard reports hedgeMissing.
AC-2 Given a do_not_claim term 'Kubernetes' When outgoing text contains it Then rulesGuard reports
     doNotClaim even if the bank mentions it.
AC-3 Given an open verification item for fact F When outgoing text contains F.value Then rulesGuard
     reports withheld.
AC-4 Given a citizenship eligibility gate in a JD When triage runs Then the verdict is PASS and the
     gate is listed in red flags.
AC-5 Given user A's fact id When user B resolves or reads it Then 404 / null; B citing it resolves
     nothing.
AC-6 Given a resume text with a number and no fact When import derives facts Then it proposes a fact
     for that number and never invents a number absent from the text.
AC-7 Given outgoing text that keeps the hedge within the same sentence as the number When
     rulesGuard runs Then no hedgeMissing violation.
```

## Test cases

```
TC-1 | core | file: test/rules.test.ts (new)
Given facts, claims and verification fixtures When rulesGuard runs Then each rule class fires only
for its case.
TC-2 | core | file: test/rules.test.ts
Given text that keeps the hedge Then no hedgeMissing violation; given the hedge in a later sentence
Then a violation.
TC-3 | store | file: test/rulesStore.test.ts (new)
Given facts for A When listFacts(B) Then [] and getFact(B, id) Then null.
TC-4 | core | file: test/import.test.ts (extend)
Given resume text with a number and no fact When deriveFacts runs Then a proposed fact is returned
and no number absent from the text is emitted.
TC-5 | route | file: test/rules-routes.test.ts (new)
Given no session Then 401; A CRUD works; B sees nothing.
TC-6 | core | file: test/rules.test.ts
Given a fact status verify When its value appears in text Then withheld fires.
```

## Edge cases

- The same number in two facts with different hedges; the validator must match the cited fact, not
  any fact.
- A standing correction whose target is absent; surface it as an unresolved correction warning.
- A fact retired while cited; treat as unresolved.
- Negated do-not-claim phrases ("not Kubernetes"); the term match is exact-word and would still
  flag, so the UI should let a user drop a claim.
- Evidence with no failures or scope limits; allowed, but the prep prompt should note the absence.
- A number that appears in both a fact and the bank bullet; either source is acceptable.

## Out of scope

Automatic resolution of verification items from the web, fact version history, cross-user sharing,
automatic fact extraction beyond the import draft.

## Dependencies

`01`. Consumed by `05`, `06`, `08`, and the existing score, tailor and import flows.

## How this beats ResuMax

This is the strongest differentiator. The anti-fabrication guarantee is code-enforced across the fact
ledger, the DO NOT CLAIM register and the verification queue, and every number's hedge is preserved
by a testable validator. ResuMax asserts "never invents" as a review policy; Career Pilot proves it
with `guard` and `rulesGuard`.
