# Career Pilot spec suite

This directory is the design-of-record for extending Career Pilot (package `resume-refiner`) from a
resume engine into a full, self-hosted job application pipeline that matches and exceeds ResuMax at
the end-to-end process. Every document here is a specification, not a tutorial and not code.

Read `00-roadmap.md` first. It carries the phase graph (F0-F8), the dependency table, the shared
service-seam rule, and the conventions referenced by every other spec. Every migration id in the
suite is assigned in phase order (see `01-domain-model.md`), so a phase can always apply its own
migrations without waiting for a later phase.

| File | Pillar | What it covers |
|---|---|---|
| [00-roadmap.md](00-roadmap.md) | meta | phase graph, dependency table, suite invariants |
| [01-domain-model.md](01-domain-model.md) | meta | entities, relationships, new vs extended tables |
| [02-foundation.md](02-foundation.md) | g | schema mechanics, resume-version model, durable execution, notifications, scheduling |
| [03-application-pipeline.md](03-application-pipeline.md) | a | application tracker, stages, notes, reminders, events, outcomes |
| [04-matching-digest.md](04-matching-digest.md) | b | saved searches, scored matches, digest |
| [05-material-variants.md](05-material-variants.md) | d | resume variants and the cover-letter editor |
| [06-interview-offer-prep.md](06-interview-offer-prep.md) | c | interview log, prep, metrics defense, negotiation |
| [07-three-layer-rules.md](07-three-layer-rules.md) | f (data) | fact ledger, engineering context, DO NOT CLAIM, verification queue |
| [08-conversation-pipeline.md](08-conversation-pipeline.md) | f (engine) | E0-E7 staged pipeline, confirmation gates |
| [09-mcp-assistant.md](09-mcp-assistant.md) | e | local stdio MCP tools |

## Ground rules for every spec

- Job-agnostic engine; tech-first content lives in data, never in `prompts/base`.
- Code-enforced anti-fabrication. Every outgoing number cites a fact or bank id and keeps its hedge.
- User-scoped stores: every function takes `userId` first; another user's row is indistinguishable
  from missing.
- Append-only migrations in `src/server/migrations.ts`; never edit an applied entry.
- One service layer: `src/server/api.ts` owns every capability; route handlers and MCP tools are thin
  adapters, so a feature is never implemented twice (`02` `FR-8`).
- Every LLM call goes through `src/providers/llm.ts`; every job-board call through
  `src/server/discovery.ts` with injectable deps and fixed user-safe errors.
- No filesystem writes in server code except `os.tmpdir()`.
- No em dashes, plain dashes only.

See `../competitive-analysis-resumax.md` for the positioning this suite is measured against.
