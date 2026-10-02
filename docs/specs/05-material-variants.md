# 05 - Material variants and cover-letter editor

## Purpose

Pillar (d): versioned resume variants and an editable, regenerable cover letter (and the other
outgoing materials), all passing the rules layer before approval and download.

## Scope

Consumption of `material_versions` introduced in `02`: variant creation from a generation run,
duplication, editing, regeneration, approval, download, and the change log.

## Non-goals

New rendering backends (`src/render/*` stays); the E2/E3 orchestration (`08`); rich-text editing.

## Context

A tailored run stores `pdf, docx, resumeJson, scoreJson, coverLetter` keyed by `job_id`
(`src/server/jobStore.ts:10-19`, `src/server/generate.ts:107-113`). The cover letter is a single
generated field (`src/core/schemas.ts` `coverLetter`), not editable or versioned. Org, title, name,
credentials and dates are always resolved from the bank at merge time, never from the model
(`src/render/typst.ts:112`). The owner's cover-letter rules live in `seed/me/personal.md:47-54`.

## User stories

- As a user, I keep several named resume variants per application and pick one as base.
- As a user, I edit the cover letter and regenerate it without losing my draft.
- As a user, I only send material after I approve it.

## Functional requirements

- FR-1 Create a resume variant from a generation run (records `job_id`) or duplicate an existing
  version as a new draft (`parent_id`).
- FR-2 List versions by application and kind; show label, status, source run, updated time.
- FR-3 Edit a version's `body` (plain text or markdown) and save; each save bumps `updated_at`.
- FR-4 Regenerate: re-run score and tailor for a variant's `job_id` and record the result as a new
  version; never overwrite an approved or sent version.
- FR-5 Cover-letter editor: load the stored body, edit, and regenerate from the bank and rules;
  regeneration is validated by the `07` validators (`rulesGuard` plus `guard`).
- FR-6 Approval: `draft -> approved` requires all validators to pass; `approved -> sent` records a
  `message` event on `03`.
- FR-7 Download: PDF and DOCX for a resume version come from the linked job's artifacts; text kinds
  download the stored body.
- FR-8 Change log: for a resume variant, show added, removed and reordered bullets versus the bank,
  derived from `resumeJson` and the bank, not full text.

## Data model changes

`material_versions` is defined in `02`. This spec adds no table. It depends on:

```sql
-- recap from 009_material_versions
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
```

## API contract

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/material-versions?applicationId=&kind=` | none | `{ versions }` |
| POST | `/api/material-versions` | `{ applicationId?, kind, label?, body?, jobId?, parentId? }` | 201 `{ version }` |
| GET | `/api/material-versions/[id]` | none | `{ version }` |
| PATCH | `/api/material-versions/[id]` | `{ body?, label?, status? }` | `{ version }` |
| POST | `/api/material-versions/[id]/regenerate` | `{ task: 'resume'\|'cover_letter' }` | 202 `{ version }` or 409 |
| POST | `/api/material-versions/[id]/approve` | none | `{ version }` or 422 |
| GET | `/api/material-versions/[id]/download?format=pdf\|docx\|txt` | none | file bytes |

Status codes: 401 no session; 404 not this user's; 409 regenerate or edit an approved/sent version;
422 validator failure with `{ error, violations }`; 413 if a body exceeds the doc byte limit.

Handlers are thin adapters over the shared service layer `src/server/api.ts` (`02` `FR-8`); approval
and regeneration live in the service so the same validator path is used by HTTP and by `09` over MCP.

## UI surfaces

- Application detail tab "Materials".
- `/applications/[id]/versions/[versionId]` editor.
- Cover-letter editor with "Regenerate" and "Approve".
- Download buttons mirroring `src/components/JobDetail.tsx:254-278`.
- Change-log panel for resume variants.

## Rules and invariants

- Approved or sent versions are immutable; an edit creates a child draft instead.
- Every generated or regenerated body passes the `07` validators before it can be approved.
- Org, title, name, credentials and dates are never stored from the model; they always render from
  the bank.
- A cover-letter body never contains the visa line; that line is for form fields and recruiter
  replies only (`seed/me/personal.md:37-40`).
- A body that contains a hedged fact must keep the hedge; `rulesGuard` enforces this.

## Acceptance criteria

```
AC-1 Given a completed job When POST material-versions kind=resume Then a draft is created and
     linked to job_id and appears under the application.
AC-2 Given an approved version When PATCH body Then 409; a new child draft can be created instead.
AC-3 Given a regenerated cover letter whose text drops a fact hedge When approve Then 422 with the
     violation and the status stays draft.
AC-4 Given user B's version When user A downloads or reads it Then 404.
AC-5 Given a resume version When GET the change log Then it lists added, removed and reordered
     bullets versus the bank and does not dump full text for unchanged bullets.
AC-6 Given a cover-letter body containing the visa line When approve Then 422.
AC-7 Given a text version with no linked job When download format=txt Then the stored body is
     returned.
```

## Test cases

```
TC-1 | store | file: test/materialStore.test.ts (new)
Given createVersion for A When getVersion(B, id) Then null; when listVersions(B) Then [].
TC-2 | route | file: test/material-routes.test.ts (new)
Given signInAs A When approve a clean version Then 200; when approve a hedgeless version Then 422
and the status stays draft.
TC-3 | core | file: test/change-log.test.ts (new)
Given a Tailored result and a Bank When buildChangeLog Then it reports added, removed and reordered
items without emitting unchanged bullet text.
TC-4 | route | file: test/material-routes.test.ts
Given an approved version When PATCH body Then 409.
TC-5 | core | file: test/material-validators.test.ts (new)
Given a cover-letter body containing the visa line When validating Then a violation is returned.
```

## Edge cases

- Version with no job (manual master); download falls back to text.
- Regenerate with no bank; 409 or a clear error, not a crash.
- Regenerated content identical to the prior version; still stored as a new version with a parent.
- Deleting the linked job sets `job_id` null and the version remains readable.
- Cover-letter word count outside 150-300; warn but do not block unless enforcement is requested.

## Out of scope

Rich-text or HTML editing, tracked changes, collaborative editing, multiple render templates,
attachment uploads.

## Dependencies

`01`, `02` (the `material_versions` table and the shared service layer), `03` (applications are the
owner row), and `07` (`rulesGuard` and `guard` gate approval and regeneration).

Consumed by `06` and `08`, which do not block it.

## How this beats ResuMax

Unlimited, editable, versioned materials with code-enforced validity and free downloads. ResuMax
gates previews, revisions and exports behind paid tiers and keeps versions inside its SaaS.
