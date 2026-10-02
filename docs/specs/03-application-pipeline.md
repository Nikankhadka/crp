# 03 - Application pipeline and tracking

## Purpose

Pillar (a): turn one posting into a tracked application with stages, notes, reminders, an append-only
event timeline, and outcome capture. This is the tracer bullet that introduces the tracked entity.

## Scope

Tables `applications`, `application_events`, `application_notes`, `reminders`; the tracker UI;
stage transitions; manual conversion from a match (`04`), from a generation run, or from a pasted JD.

## Non-goals

Generating materials (`05`), AI pipeline steps (`08`), matching and digest (`04`), notifications
transport (`02`).

## Context

`jobs` records generation, not application state (`src/server/jobStore.ts:6`). There is no notion of
applied, screening, interview, offer, rejected, or follow-up. The owner maintains an active pipeline
in prose (`seed/me/job-search-vertical.md:1512-1521`), which this spec makes durable.

## User stories

- As a user, I paste a JD or pick a match and get an application I can move through stages.
- As a user, I log a note after a call and set a follow-up reminder.
- As a user, I record the outcome and see the full timeline.

## Functional requirements

- FR-1 Create an application from a JD, a URL, or a match. Fields: company, role, url, source,
  external id, location, employment type, salary band, verdict, jd text, stage.
- FR-2 Stage enum: `triage, intel, materials, applied, screening, interview, offer, rejected,
  withdrawn, accepted`; default `triage`.
- FR-3 Every stage change appends an `application_events` row with from/to stage and a timestamp.
- FR-4 Notes: create, list, delete. Kinds: `note, debrief, question, red_flag`.
- FR-5 Reminders: create, list, complete. Fields `due_at`, `kind`, `message`. A due reminder becomes
  a notification through the `02` scheduler.
- FR-6 Outcome capture: set `outcome` and move to a terminal stage (`rejected`, `withdrawn`,
  `accepted`); terminal stages set `closed_at`.
- FR-7 Dedup: partial unique `(user_id, source, external_id)` when `external_id` is present; a
  normalized-URL fallback when it is not.
- FR-8 List filters: stage, company, has-reminder, recency; default sort `updated_at desc`.

## Data model changes

```sql
-- 004_applications
create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  company text not null default '',
  role text not null default '',
  url text,
  source text,
  external_id text,
  location text,
  employment_type text,
  salary_min int,
  salary_max int,
  salary_currency text,
  verdict text check (verdict in ('apply','apply_with_caveat','pass')),
  stage text not null default 'triage'
    check (stage in ('triage','intel','materials','applied','screening','interview','offer','rejected','withdrawn','accepted')),
  outcome text,
  jd text not null default '',
  base_version_id uuid,
  applied_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index applications_user_stage_idx on applications (user_id, stage, updated_at desc);
create unique index applications_dedup_idx on applications (user_id, source, external_id)
  where external_id is not null;

-- 005_application_events_notes_reminders
create table application_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  kind text not null check (kind in ('created','stage_changed','note','reminder','material','message','interview','outcome')),
  from_stage text,
  to_stage text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index application_events_app_idx on application_events (application_id, created_at desc);

create table application_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  kind text not null default 'note' check (kind in ('note','debrief','question','red_flag')),
  body text not null,
  created_at timestamptz not null default now()
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  due_at timestamptz not null,
  kind text not null default 'follow_up',
  message text not null default '',
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index reminders_due_idx on reminders (user_id, due_at) where done_at is null;
```

## API contract

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/applications` | query `stage`, `q` | `{ applications: [...] }` |
| POST | `/api/applications` | `{ company?, role?, url?, jd?, source?, externalId? }` | 201 `{ application }` |
| GET | `/api/applications/[id]` | none | `{ application, events, notes, reminders }` |
| PATCH | `/api/applications/[id]` | partial fields incl. `stage`, `outcome` | `{ application }` |
| DELETE | `/api/applications/[id]` | none | `{ ok: true }` |
| GET | `/api/applications/[id]/events` | none | `{ events }` |
| POST | `/api/applications/[id]/notes` | `{ body, kind? }` | 201 `{ note }` |
| DELETE | `/api/applications/[id]/notes/[noteId]` | none | `{ ok: true }` |
| POST | `/api/applications/[id]/reminders` | `{ dueAt, message?, kind? }` | 201 `{ reminder }` |
| POST | `/api/reminders/[id]/complete` | none | `{ ok: true }` |

Status codes: 400 bad JSON or field; 401 no session; 404 not this user's; 409 dedup conflict.
All handlers use `withUser` (`src/server/currentUser.ts:80`).

Each handler is a thin adapter over the shared service layer `src/server/api.ts` (`02` `FR-8`):
parse and validate the body, call one `application*` service function with the resolved `userId`,
and map the result to a status code. No route handler calls a store or the LLM directly, so `09`
exposes the identical behavior over MCP.

## UI surfaces

- `/applications`: list or board grouped by stage, with filters and a "New application" action.
- `/applications/[id]`: header with company/role/url, stage control, timeline, notes, reminders, and
  tabs for Materials (`05`), Pipeline (`08`), and Interview (`06`).
- Nav link "Applications" in `src/components/AppNav.tsx`.
- New components under `src/app/applications/components/`.

## Rules and invariants

- Stage transitions are unrestricted (a user may move backward) but every change is logged.
- A terminal stage requires an `outcome`.
- Deleting an application cascades its events, notes, reminders, material versions, pipeline runs and
  interview log entries.
- Every read and write scopes by `user_id`; a wrong id returns 404 or null, indistinguishable from
  missing.
- `jobs` is never mutated by this spec; linking is via `material_versions.job_id`.

## Acceptance criteria

```
AC-1 Given an authed user When POST /api/applications with a JD Then 201, stage is triage, and a
     'created' event exists.
AC-2 Given an application When PATCH stage to interview Then updated_at bumps and an
     application_events row records the from/to transition.
AC-3 Given a reminder past due When the scheduler runs Then a notification exists; running it again
     creates no duplicate.
AC-4 Given user A's application id When user B requests it Then 404.
AC-5 Given a terminal outcome When PATCH stage=rejected with no outcome Then 400; with an outcome
     Then closed_at is set.
AC-6 Given the same (source, external_id) twice When POST twice Then the second answers 409 and only
     one row exists.
AC-7 Given an application When DELETE Then its events, notes and reminders are gone and a read
     returns 404.
```

## Test cases

```
TC-1 | store | file: test/applicationStore.test.ts (new)
Given freshDb When createApplication for A Then getApplication(B, id) is null and listApplications(B)
Then [].
TC-2 | route | file: test/application-routes.test.ts (new)
Given signInAs A When POST jd Then 201; when signInAs B and GET A's id Then 404.
TC-3 | store | file: test/applicationStore.test.ts
Given a stage change When listEvents Then one event with the from/to stages.
TC-4 | pipeline | file: test/reminder-cron.test.ts (new)
Given a due reminder When the cron materializes Then one notification; a second run adds none.
TC-5 | route | file: test/application-routes.test.ts
Given duplicate external id When POST twice Then 409 and one row.
TC-6 | store | file: test/applicationStore.test.ts
Given an application with events and notes When deleteApplication Then children are gone.
```

## Edge cases

- Application with no JD; URL-only; empty company/role fall back to "Untitled".
- Stage moved out of order; allowed and logged.
- Reminder due in the past and not yet materialized.
- Dedup when `external_id` is absent; fall back to normalized URL, and allow duplicates if neither
  exists.
- Delete cascades; verify no orphan child rows.

## Out of scope

Email sync, calendar integration, attachments, automatic status from job boards, shared boards.

## Dependencies

`01` (vocabulary and migrations), `02` (the shared service layer, notifications and the daily
scheduler that materializes due reminders into notifications).

`05` adds `material_versions` rows that point back at an application; the link is
`material_versions.application_id` and it is added by `05`, so it does not block this spec.

## How this beats ResuMax

Full tracker parity (ten stages, timeline, notes, reminders, outcomes) at zero cost with no usage
caps, fully self-hostable, and with no path to mass auto-apply. ResuMax tracks applications inside a
closed paid SaaS.
