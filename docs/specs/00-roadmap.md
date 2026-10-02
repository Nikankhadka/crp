# 00 - Roadmap

## Purpose

Single entry point for the spec suite: the phase graph, the dependency table, the shared
conventions every other spec follows, and the definition of done for the suite.

## Scope

Ordering and dependencies of specs `01`-`09`; the product phases `F0`-`F8`; the spec-authoring order;
the suite-wide invariants.

## Non-goals

Product rationale and competitor analysis (see `../competitive-analysis-resumax.md`); implementation
task breakdown and estimates.

## Context

Career Pilot today is a job-agnostic resume engine: score a JD against a personal seed bank, tailor
bullets and the summary, render an ATS-safe PDF (Typst) plus DOCX, with an optional cover letter.
The hosted app stores jobs, artifacts, docs and banks in Postgres or embedded PGlite. A `jobs` row is
a generation run, not an application (`src/server/jobStore.ts:6`). Discovery is optional Adzuna
search plus Firecrawl URL import (`src/server/discovery.ts`). The engine has no application tracking,
matching, interview prep, material variants, or assistant integration.

The owner's pipeline vision (`seed/me/job-search-vertical.md`) defines one conversation per job, a
three-layer model (facts, evidence, instructions), an E0-E7 pipeline, and a rules layer (fact ledger,
engineering context, DO NOT CLAIM register, verification queue). This suite encodes that vision while
preserving the existing contract: user-scoped stores, append-only migrations, one LLM seam, one
discovery seam, job-agnostic prompts, code-enforced anti-fabrication.

## User stories

- As the owner, I can read one roadmap and know what to build next and why.
- As a contributor, I can map any proposed change to exactly one spec.
- As a reviewer, I can see each phase ship independently and reversibly.

## Functional requirements

- FR-1 State the phase order and each phase's independently shippable outcome.
- FR-2 Carry a dependency table (spec, depends on, blocks).
- FR-3 Define the shared conventions: spec template, acceptance-criteria format, test-case format,
  migration rules, prompt rules.
- FR-4 State the suite-wide invariants: user scoping, append-only migrations, LLM seam, discovery
  seam, job-agnostic prompts, code-enforced anti-fabrication, no em dashes, no auto-apply.
- FR-5 State the shared service seam: route handlers and MCP tools are thin adapters over
  `src/server/api.ts` (`02` `FR-8`), so no capability exists twice.

## Phase graph

Each phase is independently shippable and reversible. A phase applies only its own migrations, whose
ids are assigned in this order (see `01`), so no phase is ever blocked by a missing lower id. Nothing
after a phase's boundary is required for it to run.

| Phase | Specs | Migrations | Independently shippable outcome |
|---|---|---|---|
| F0 Foundation | `02` | `003` | A long generation is leased, retried with backoff and no longer dies silently; `runAsUser` lets a non-cookie caller execute scoped work. |
| F1 Tracker | `03` (+ `02` notifications) | `004`, `005`, `006` | A posting becomes a tracked application with ten stages, an event timeline, notes, reminders and outcome capture. |
| F2 Rules layer | `07` | `007`, `008` | A fact ledger, engineering evidence, a DO NOT CLAIM register and a verification queue that `rulesGuard` enforces on every outgoing number, hedge and claim. |
| F3 Materials | `05` (+ `02` versions) | `009` | Named, versioned resume and cover-letter materials with a change log, immutable approvals and downloads. |
| F4 Interview and offer prep | `06` | `010` | Interview log with carry-forward lessons, stage/format-aware prep, metrics defense and negotiation that never invents market figures. |
| F5 Matching and digest | `04` | `011` | Saved searches over the discovery seam, scored matches with reasons, a daily digest, and explicit conversion to a tracked application. |
| F6 Conversation pipeline | `08` | `012` | One paste of a JD or URL runs E0-E7, each stage gated by an explicit confirmation, every output validated by the rules layer. |
| F7 Assistant bridge | `09` | `013` (deferred) | The same capabilities over local stdio MCP, owner-scoped, read tools free and every write a dry run without `confirm`. |
| F8 Hardening | cross-cutting | none | Per-user rate limits, the `after()` timeout budget, structured observability, and a data export and delete path. |

F0 through F2 are the load-bearing slice: they add no new user-facing surface beyond a tracker and
the rules layer, and everything after them is easier to build because the service seam, the
invariants and the validators already exist.

## Dependency table

Every dependency is build-time. "Blocks" names the phases a spec must ship after.

| Spec | Depends on | Blocks |
|---|---|---|
| `00-roadmap` | none | `01` |
| `01-domain-model` | `00` | `02`-`09` |
| `02-foundation` | `01` | F1, F3, and the service seam every later pillar uses |
| `03-application-pipeline` | `01`, `02` | F4, F5, F6, F7 |
| `04-matching-digest` | `01`, `02`, `03` | none |
| `05-material-variants` | `01`, `02`, `03`, `07` | F4, F6, F7 |
| `06-interview-offer-prep` | `01`, `03`, `05`, `07` | F6, F7 |
| `07-three-layer-rules` | `01` | F3, F4, F6, F7, and the existing score, tailor and import flows |
| `08-conversation-pipeline` | `03`, `05`, `06`, `07` | F7 |
| `09-mcp-assistant` | `01`, `03`, `05`, `06`, `07`, `08` | none |

The graph is acyclic: `03` does not wait for `05` (the link is the nullable
`material_versions.application_id` that `05` adds), `05` does not wait for `08`, and `06` does not
wait for `08`. `08` consumes the other three at the E2, E3 and E5 steps.

## Data model changes

None. This spec links the migrations owned by `01`-`09` and fixes their numbering so that ids run in
phase order: `003` (F0), `004`-`006` (F1), `007`-`008` (F2), `009` (F3), `010` (F4), `011` (F5),
`012` (F6), `013` (F7, deferred).

## API contract

None.

## UI surfaces

None.

## Rules and invariants

- Every phase is independently shippable and reversible.
- No phase requires a destructive migration.
- No phase weakens an existing invariant, especially user scoping and the anti-fabrication guard.
- No phase adds an auto-apply, auto-message, or other action that acts on an employer without a
  human confirmation.
- Every capability is implemented once, as a service function in `src/server/api.ts` (`02` `FR-8`).
  A route handler or an MCP tool that calls a store, a prompt or the LLM directly is a defect. This
  is what stops HTTP and MCP from drifting, and it is why no phase "adds MCP support" later.
- Migration ids follow phase order, so a phase can always apply its own migrations in order without
  waiting for a phase that ships later.

## Acceptance criteria

```
AC-1 Given a reader on this file When they pick any spec Then its dependencies are listed and are
     either already built or scheduled earlier.
AC-2 Given the phase table When a phase is completed Then it ships without any later phase.
AC-3 Given the suite When a spec is added Then it uses the 16-section template and links back here.
AC-4 Given the phase and dependency tables When every spec's Dependencies section is compared against
     the dependency table Then they agree, and the graph is acyclic.
AC-5 Given the phase table When each phase's migrations are listed against `01` Then every phase's
     ids are contiguous with the phases before it and no phase applies a migration whose lower ids
     do not exist yet.
AC-6 Given any pillar spec that defines an HTTP route When its API contract is read Then it states
     that the handler is a thin adapter over `src/server/api.ts`.
```

## Test cases

```
TC-1 | core (docs guard) | file: test/prompt.test.ts style check
Given the docs/specs tree When the job-agnostic vocabulary guard runs against spec bodies Then no
occupation-specific prompt vocabulary is introduced.
TC-2 | manual | review
Given the README file table When compared to the directory listing Then they match.
TC-3 | manual | review
Given each spec When its headings are read Then all 16 template headings are present.
TC-4 | manual | review
Given the dependency table When the edges are walked Then no cycle exists, so a build order exists.
TC-5 | manual | review
Given every migration id in `01` and the SQL comments in `02`-`09` When compared Then no two specs
claim the same id and every id maps to one owner spec.
```

## Edge cases

- A spec with no predecessor (`01`, `02`) is startable immediately.
- A dependency slipping does not block unrelated phases.
- A future spec that touches an applied migration must add a new entry instead.

## Out of scope

Scheduling tools, Gantt charts, issue-tracker integration, estimates.

## Dependencies

None. Authored first.

## How this beats ResuMax

The roadmap is public, inspectable and local to the user's repository. ResuMax's roadmap is a
vendor marketing surface the user cannot read, fork, or self-host.
