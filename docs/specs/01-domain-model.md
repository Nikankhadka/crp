# 01 - Domain model

## Purpose

Define every entity, relationship, id convention, and the new-versus-extended table map, so all
other specs share one vocabulary and one migration plan.

## Scope

Existing tables (`users`, `banks`, `docs`, `jobs`, `artifacts`, `invites`, `schema_migrations`) plus
the new tables introduced by this suite; the relationship map; the migration list and numbering.

## Non-goals

Column-level behavior and API contracts (owned by the pillar specs); UI.

## Context

`jobs` is a generation run: `JobStatus = queued|scoring|tailoring|rendering|done|error`, keyed by a
text id, with `artifacts` keyed `(job_id, name)` (`src/server/migrations.ts:34-60`,
`src/server/jobStore.ts:6-23`). Stores take `userId` first (`src/server/jobStore.ts`,
`src/server/docsStore.ts`, `src/server/seedBank.ts`). Personal facts live as free-form bank sections
(`src/core/bank.ts`). The DO NOT CLAIM register and verification queue live as prose in
`seed/me/personal.md` and are only partly wired into code (`src/core/guard.ts` `neverMention`).

There is no notion of an application, a stage, a note, a reminder, a resume version, a fact ledger,
an evidence record, a DO NOT CLAIM row, a verification item, a saved search, a match, a
notification, a pipeline run, or an interview log entry.

## User stories

- As a developer, I can look up any entity and know its owner column, its id type, and which spec
  owns it.
- As a reviewer, I can confirm no table leaks across users and no applied migration was edited.

## Functional requirements

- FR-1 Publish the entity catalog with owner column and id type.
- FR-2 Publish the relationship map.
- FR-3 Classify each table as NEW or an extension of an existing table.
- FR-4 Fix id conventions: `uuid` for internal rows, user-scoped text id for cited-atom tables
  (`facts`, `evidence_records`) so generated content can cite an id without cross-user leakage.
- FR-5 State the isolation invariant: another user's row is indistinguishable from missing.

## Data model changes

### Entity catalog

Existing, unchanged: `users`, `banks`, `docs`, `invites`, `artifacts`, `schema_migrations`.
Existing, extended: `jobs` gains nullable execution-lease columns only (`003`); it is never turned
into an application.

New user-owned tables:

| Entity | Table | Id | Purpose | Spec |
|---|---|---|---|---|
| Application | `applications` | uuid | the tracked application | 03 |
| Application event | `application_events` | uuid | append-only stage/action log | 03 |
| Application note | `application_notes` | uuid | user-authored notes and debriefs | 03 |
| Reminder | `reminders` | uuid | follow-up due dates | 03 |
| Material version | `material_versions` | uuid | resume/cover-letter/outreach/form/prep drafts | 02, 05 |
| Fact | `facts` | text (`user_id`,`id`) | fact ledger entry with value, hedge, confidence | 07 |
| Evidence record | `evidence_records` | text (`user_id`,`id`) | engineering context, failures, scope limits | 07 |
| Claim | `claims` | uuid | DO NOT CLAIM, standing correction, eligibility gate | 07 |
| Verification item | `verification_items` | uuid | withhold-from-outgoing queue | 07 |
| Pipeline run | `pipeline_runs` | uuid | one conversation = one application | 08 |
| Pipeline step | `pipeline_steps` | (`run_id`,`step`) | per-step output and confirmation gate | 08 |
| Saved search | `saved_searches` | uuid | stored Adzuna query and cadence | 04 |
| Match | `matches` | uuid | scored listing from a search | 04 |
| Notification | `notifications` | uuid | in-app and NTFY dispatch record | 02 |
| Interview log entry | `interview_log_entries` | uuid | stage, what happened, carry-forward | 06 |
| API token (future) | `api_tokens` | uuid | only if HTTP MCP is added later | 09 |

### Relationships

```
users 1---* applications
users 1---1 banks
users 1---* docs
users 1---* jobs 1---* artifacts
users 1---* facts / evidence_records / claims / verification_items
users 1---* saved_searches 1---* matches
users 1---* notifications

applications 1---* material_versions 0..1--- jobs
applications 1---* application_events
applications 1---* application_notes
applications 1---* reminders
applications 1---* interview_log_entries
applications 1---* pipeline_runs 1---* pipeline_steps
applications.base_version_id --> material_versions (nullable)
matches.application_id --> applications (when converted)
verification_items.fact_id / evidence_id --> cited atom
```

`jobs` stays a generation run. In the UI, `jobs` is labelled "Tailor runs"; `applications` is the
tracked unit. A generation run may exist with no application (current behavior); an application may
exist with no run (manual tracking).

### Migration plan (append-only)

Migration ids are assigned in the order the phases in `00-roadmap.md` build them, so a phase can
always apply its own migrations without a gap: a phase may only apply migration `N` once every
lower-numbered migration exists.

| Id | Creates / alters | Owner spec | Phase |
|---|---|---|---|
| `003_job_execution` | `jobs` lease columns and claim index | 02 | F0 |
| `004_applications` | `applications` | 03 | F1 |
| `005_application_events_notes_reminders` | `application_events`, `application_notes`, `reminders` | 03 | F1 |
| `006_notifications` | `notifications` | 02 | F1 |
| `007_three_layer` | `facts`, `evidence_records`, `claims` | 07 | F2 |
| `008_verification_items` | `verification_items` | 07 | F2 |
| `009_material_versions` | `material_versions`, `applications.base_version_id` FK | 02, 05 | F3 |
| `010_interview_log` | `interview_log_entries` | 06 | F4 |
| `011_saved_searches_matches` | `saved_searches`, `matches` | 04 | F5 |
| `012_pipeline_runs` | `pipeline_runs`, `pipeline_steps` | 08 | F6 |
| `013_api_tokens` | deferred, not applied by default | 09 | F7 |

Foreign-key constraints this ordering satisfies: `006` and `009` reference `applications` (`004`);
`006` references `reminders` (`005`); `008` and `012` reference `applications` (`004`).
`002_auth_invites` is the last applied migration today, so `003` is the next id free.

No migration edits an applied entry. None of the ids above have shipped, so renumbering them is
free; after `003` is applied, new work takes the next free id.

## API contract

None. Stores are defined in their pillar specs.

## UI surfaces

None. This spec is a vocabulary and migration reference.

## Rules and invariants

- No table without `user_id`, except `schema_migrations`.
- No nullable `user_id`. `user_id` always has `on delete cascade` to `users`.
- No FK path lets an unauthenticated caller reach another user's rows.
- Cited-atom ids (`facts`, `evidence_records`) are unique per user, so a citation cannot resolve to
  another user's row.
- Timestamps are `timestamptz not null default now()`; `updated_at` is bumped by the store.

## Acceptance criteria

```
AC-1 Given a NEW table When its DDL is read Then it has user_id not null and on delete cascade.
AC-2 Given a cited atom When it appears in generated content Then its id is unique per user and
     resolves only for its owner.
AC-3 Given a jobs row When it is read as an application Then no jobs column is repurposed; the link
     is material_versions.job_id.
AC-4 Given an applied migration When a change is needed Then a new migration id is added instead of
     editing the applied one.
AC-5 Given a fresh database When 001-012 apply Then reapplying is a no-op.
```

## Test cases

```
TC-1 | store | file: test/migrations.test.ts (new)
Given a fresh database When migrate runs Then every expected table exists; when migrate runs again
Then schema_migrations is unchanged and no error is thrown.
TC-2 | store | file: test/db-helper.ts extension
Given userA and userB with a row in every new table When each store lists for B Then B sees none of
A's rows.
TC-3 | store | file: test/migrations.test.ts
Given the MIGRATIONS array When ids are collected Then they are unique and ordered.
```

## Edge cases

- Empty owner: `applications.base_version_id` is nullable.
- Deleting a user cascades every owned row.
- Deleting a generation run sets `material_versions.job_id` null but keeps the version.
- `jobs.id` is text while `applications.id` is uuid, so joins must not assume a shared type.
- A cited fact is retired or deleted while still referenced by a material body; the validator must
  treat it as unresolved, not silently valid.

## Out of scope

Physical partitioning, retention and archival jobs, soft deletes, multi-tenant row-level security.

## Dependencies

None. Authored after `00`.

## How this beats ResuMax

The data model lives in the user's own repository, is migratable by the user, and is readable end to
end. ResuMax's career record is an opaque vendor-held structure the user cannot inspect or port.
