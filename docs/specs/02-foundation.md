# 02 - Foundation

## Purpose

Platform changes (pillar g) that every other pillar depends on: durable generation execution, the
resume-version model, notifications, scheduling, and the identity seam for non-cookie callers
(MCP/CLI).

## Scope

Migrations `003_job_execution`, `009_material_versions`, `006_notifications`; the internal worker
route; the `notify()` seam; the daily scheduler; the `runAsUser()` seam.

## Non-goals

Application stages and notes (`03`); matching (`04`); MCP tool definitions (`09`); rendering
backends (`src/render/*` stays).

## Context

- Generation runs use `after()` with `maxDuration = 300` and a stale sweep that turns a running job
  untouched for `JOB_STALE_SECONDS` into `error` on the next read
  (`src/app/api/jobs/route.ts:8-13`, `src/server/jobStore.ts:82-98`). A run that dies mid-pipeline is
  not resumed and the same work is never retried.
- `artifacts` are keyed by `job_id` (`src/server/migrations.ts:53-60`); there is no durable, named
  resume version that outlives a run or can be reused across applications.
- `NTFY_TOPIC` is reserved in `.env.example` but unused. There is no notification table or dispatch.
- Route handlers require a session cookie (`src/server/currentUser.ts`); there is no seam for a
  non-cookie caller such as the MCP server or the CLI.

## User stories

- As a user, a long generation is leased and retried instead of silently dying.
- As a user, I get a follow-up or digest notification even when no browser is open.
- As an engineer, resume variants are durable, named rows linked to the run that produced them.
- As an MCP/CLI caller, I can execute against an explicit user id without a session cookie.

## Functional requirements

- FR-1 Durable execution: add `jobs.locked_at`, `jobs.locked_by`, `jobs.attempts`, `jobs.run_after`;
  implement `claimJob()` as `select ... for update skip locked`; pipeline stages are idempotent and
  resumable.
- FR-2 Retry: on error, increment `attempts`; requeue with a backoff `run_after` while
  `attempts < JOB_MAX_ATTEMPTS` (default 2); after the cap, set `status = 'error'` with the recorded
  message.
- FR-3 Worker: `POST /api/internal/worker` drains queued jobs; protected by an
  `x-internal-secret` header checked against `INTERNAL_CRON_SECRET`, never the session cookie; also
  invoked by a Vercel cron.
- FR-4 Resume-version model: `material_versions` table with
  `kind in ('master','resume','cover_letter','outreach','form_answers','prep_sheet')`, `status in
  ('draft','approved','sent','archived')`, `body`, optional `job_id`, optional `parent_id`, `meta`.
- FR-5 Notifications: `notifications` table plus `notify(userId, { kind, title, body, applicationId,
  reminderId })` with adapters: `in_app` always inserts; `ntfy` posts to `NTFY_TOPIC` when set;
  `console` under test. `notify()` never throws.
- FR-6 Scheduling: a daily cron runs enabled saved searches (`04`) and materializes due reminders
  (`03`) into notifications. The browser never polls for this.
- FR-7 `runAsUser(userId)` seam: a non-cookie caller executes store and core calls scoped to an
  explicit user id. The web app continues to use `currentUser()`.
- FR-8 Shared service layer `src/server/api.ts`: every capability is a plain async function taking
  `(userId, input)` and returning a value or a typed error, with the session cookie resolved by the
  route handler and passed in as `userId`. Route handlers become thin adapters that parse input,
  call one service function and map the result to a status code. No route handler calls a store, a
  prompt or the LLM directly. This module is the single seam that `09` exposes over MCP, so HTTP and
  MCP behavior cannot drift.

## Data model changes

```sql
-- 003_job_execution
alter table jobs add column locked_at timestamptz;
alter table jobs add column locked_by text;
alter table jobs add column attempts int not null default 0;
alter table jobs add column run_after timestamptz not null default now();
create index jobs_claim_idx on jobs (status, run_after) where status = 'queued';

-- 006_notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  application_id uuid references applications (id) on delete cascade,
  reminder_id uuid references reminders (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx
  on notifications (user_id, created_at desc) where read_at is null;

-- 009_material_versions
create table material_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  application_id uuid references applications (id) on delete cascade,
  kind text not null check (kind in ('master','resume','cover_letter','outreach','form_answers','prep_sheet')),
  label text not null default '',
  status text not null default 'draft' check (status in ('draft','approved','sent','archived')),
  body text not null default '',
  job_id text references jobs (id) on delete set null,
  parent_id uuid references material_versions (id) on delete set null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index material_versions_app_idx on material_versions (user_id, application_id, kind, created_at desc);
alter table applications add constraint applications_base_version_fk
  foreign key (base_version_id) references material_versions (id) on delete set null;
```

Environment additions: `INTERNAL_CRON_SECRET`, `JOB_MAX_ATTEMPTS` (default 2), `JOB_BACKOFF_SECONDS`
(default 60), `NTFY_TOPIC` (already reserved).

## API contract

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/internal/worker` | `x-internal-secret` | `{ limit? }` | `{ processed, errors }` |
| GET | `/api/notifications` | session | none | `{ notifications: [...] }` |
| POST | `/api/notifications/[id]/read` | session | none | `{ ok: true }` or 404 |

Status codes: 401 no session (read routes); 403 missing or wrong internal secret; 404 not this user's
row; 500 never returned with an internal message (map to a fixed string).

Service functions added under `src/server/api.ts` by this spec:

| Function | Signature | Used by |
|---|---|---|
| `claimNextJob` | `(userId, limit) => JobRow[]` | worker route |
| `notify` | `(userId, { kind, title, body, applicationId?, reminderId? }) => void` | `03`, `04`, `06` |
| `listNotifications` | `(userId) => Notification[]` | notification route |
| `markNotificationRead` | `(userId, id) => boolean` | notification route |

## UI surfaces

- Nav unread badge in `src/components/AppNav.tsx`.
- `/notifications` page listing rows with a mark-read action.
- No scheduling form in this slice.

## Rules and invariants

- A job is claimed by at most one worker; a restart never double-runs a completed stage.
- `notify()` is best-effort and never fails the calling operation, mirroring `writeTrace` in
  `src/providers/llm.ts`.
- Server code writes no filesystem except `os.tmpdir()`; notifications live in the database.
- The worker route is the only non-cookie write path, guarded by the internal secret, and it never
  receives user input beyond a limit.
- `runAsUser` must not be reachable from the web request path.

## Acceptance criteria

```
AC-1 Given two queued jobs and two concurrent workers When both claim Then each job is claimed
     exactly once.
AC-2 Given a job whose stage throws When attempts < cap Then status returns to queued with a future
     run_after; when attempts >= cap Then status is error with the stage's message.
AC-3 Given NTFY_TOPIC unset When notify() is called Then a notification row is inserted, no network
     call is made, and no error is thrown.
AC-4 Given a session user When GET /api/notifications Then only that user's rows return; user B sees
     an empty list.
AC-5 Given a non-cookie caller When runAsUser(userId) is used Then stores are scoped to userId and
     the session cookie is never read.
AC-6 Given a request to /api/internal/worker without the internal secret Then 403, and no job is
     claimed or mutated.
AC-7 Given a completed job When a worker re-claims it Then it is not selected, because only
     'queued' rows are claimable.
```

## Test cases

```
TC-1 | store | file: test/jobStore.test.ts (extend)
Given a queued job When claimJob runs Then it returns the job and sets locked_at; when claimJob runs
again for the same job Then it returns null.
TC-2 | pipeline | file: test/worker.test.ts (new)
Given a throwing score dep and JOB_MAX_ATTEMPTS=2 When the worker drains Then attempts increments,
run_after moves forward, and the final status is error with no artifact rows.
TC-3 | store | file: test/notificationStore.test.ts (new)
Given NTFY_TOPIC unset When notify() is called Then a row exists and the injected fetch was never
called; given a fetch that rejects When notify() is called Then no error propagates.
TC-4 | route | file: test/notification-routes.test.ts (new)
Given no session When GET /api/notifications Then 401; given A's rows and signed in as B Then [].
TC-5 | route | file: test/worker-route.test.ts (new)
Given a wrong or missing secret When POST /api/internal/worker Then 403 and the job is unchanged.
TC-6 | store | file: test/materialStore.test.ts (new)
Given a version for A When getVersion(B, id) Then null; when listVersions(B) Then [].
```

## Edge cases

- Worker timeout mid-stage; the lease is reclaimed after the stale window and the stage is retried.
- Duplicate cron fire; the claim query makes the second a no-op.
- NTFY unreachable; the row is still inserted and the error is swallowed.
- Notification for an application that is deleted; cascade removes it.
- A version whose `job_id` is deleted; `job_id` becomes null and the version remains readable.
- A manual (no-job) `master` version has no binary artifact; downloads fall back to the text body.

## Out of scope

External queues (SQS, Redis, Temporal), email, mobile push, per-user rate limits, multi-region
locking.

## Dependencies

`01`. Scheduling (`FR-6`) is consumed by `03` (reminders) and `04` (digest).

## How this beats ResuMax

Durable execution runs on the user's existing Postgres or PGlite with no managed queue and no
billing. Notifications are local and configurable (NTFY), and resume variants are portable rows the
user owns. ResuMax runs this infrastructure vendor-side and behind paid tiers.
