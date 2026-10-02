# 04 - Matching and digest

## Purpose

Pillar (b): saved searches over the existing discovery seam, scored matches, and a reviewable
digest that converts a listing into a tracked application.

## Scope

Tables `saved_searches`, `matches`; the search/digest service; the `/matches` UI; the daily cron.

## Non-goals

A native job market or crawler; auto-apply; messaging employers; résumé-blind ranking.

## Context

`searchJobs(input, { fetch, env })` and `fetchPosting` already exist and are optional
(`src/server/discovery.ts:139-265`). `DiscoveryError` carries a user-safe message and an HTTP status
(400/503/502). `score()` already scores a JD against the personal layer, caps a partial posting at
75, and returns `mustHavesMet`, `mustHavesMissing`, `keywordsToMirror` and `redFlags`
(`src/core/score.ts`, `prompts/base/score.md`). The seeded digest does not exist today; discovery is
click-driven only.

## User stories

- As a user, I save a search and get a digest of new, scored roles.
- As a user, I dismiss noise and convert a match into an application.
- As a user with no API keys, I can still use the app by pasting JDs.

## Functional requirements

- FR-1 Saved search: `what`, `where`, `country`, `filters` (min salary, remote, seniority keywords),
  `cadence` (`manual|daily|weekly`), `enabled`.
- FR-2 Run a search through `searchJobs` with injected deps; map listings to `matches`; dedup on
  `(user_id, source, external_id)`.
- FR-3 Score each new listing with the existing rubric on the snippet (`descriptionIsFull: false`),
  so the 75 cap applies and is recorded; store score, verdict and reasons.
- FR-4 Digest: top N unseen matches across enabled searches (default 5, max 10), ordered by score
  then recency; insert an in-app notification when a digest is produced.
- FR-5 Convert a match to an application (`03`), carrying company, role, url, source, external id,
  and a JD fetched via `fetchPosting` when a URL import is configured.
- FR-6 Degrade cleanly: with Adzuna unset, a run answers 503 with the fixed discovery message; no
  crash, no key echo.
- FR-7 Cost cap: at most `DIGEST_MAX_SCORES` (default 20) listings scored per run.

## Data model changes

```sql
-- 011_saved_searches_matches
create table saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  what text not null default '',
  where_text text not null default '',
  country text not null default 'us',
  filters jsonb not null default '{}',
  cadence text not null default 'manual' check (cadence in ('manual','daily','weekly')),
  last_run_at timestamptz,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index saved_searches_user_idx on saved_searches (user_id, enabled);

create table matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  search_id uuid references saved_searches (id) on delete set null,
  source text not null,
  external_id text not null,
  title text not null,
  company text not null default '',
  location text not null default '',
  url text not null,
  snippet text not null default '',
  score int,
  verdict text,
  reasons jsonb not null default '{}',
  status text not null default 'new' check (status in ('new','saved','dismissed','applied')),
  application_id uuid references applications (id) on delete set null,
  seen_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);
create index matches_user_status_idx on matches (user_id, status, score desc);
```

Environment: `DIGEST_MAX_SCORES` (default 20). Reuses `ADZUNA_*`, `ADZUNA_COUNTRY`,
`FIRECRAWL_*` and `ADZUNA_BASE_URL` / `FIRECRAWL_BASE_URL`.

## API contract

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/saved-searches` | none | `{ searches }` |
| POST | `/api/saved-searches` | `{ what, where?, country, filters?, cadence? }` | 201 `{ search }` |
| PATCH | `/api/saved-searches/[id]` | partial | `{ search }` |
| DELETE | `/api/saved-searches/[id]` | none | `{ ok: true }` |
| POST | `/api/saved-searches/[id]/run` | none | `{ matches, total }` or 503 |
| GET | `/api/matches?status=new` | none | `{ matches }` |
| POST | `/api/matches/[id]/dismiss` | none | `{ ok: true }` |
| POST | `/api/matches/[id]/apply` | none | 201 `{ application }` |
| GET | `/api/digest` | none | `{ matches }` |

Status codes: 400 bad input; 401 no session; 404 not this user's; 503 discovery unconfigured; 502
upstream failed. Discovery errors are mapped to the existing fixed strings from
`src/server/discovery.ts`.

Handlers are thin adapters over the shared service layer `src/server/api.ts` (`02` `FR-8`); the
search, scoring and digest logic lives in the service, not in the route, so `09` exposes the same
behavior over MCP.

## UI surfaces

- `/matches`: digest list with score chips, reasons, dismiss and "Track application" actions.
- `/discover` gains "Save this search".
- Nav link "Matches".
- New components under `src/app/matches/components/`.

## Rules and invariants

- Never echo an upstream URL or body; every failure maps to a fixed user-safe message, because the
  Adzuna key travels in the request URL (`src/server/discovery.ts:7`).
- A match's `user_id` always equals the owner of its search; a match never crosses users.
- Scoring reuses `score()`; no private or hidden ranking model.
- The digest never creates applications automatically; conversion is an explicit user action.
- No cron run writes outside the user's own rows.

## Acceptance criteria

```
AC-1 Given Adzuna unset When POST /api/saved-searches/[id]/run Then 503 with the fixed message.
AC-2 Given a listing returned twice by upstream When the search runs Then exactly one match row
     exists for that (source, external_id).
AC-3 Given a snippet listing When the digest runs Then score and reasons are populated and
     score <= 75.
AC-4 Given user B's match id When user A dismisses it Then 404 and the row is unchanged.
AC-5 Given a match When apply is called Then an application is created with the match fields and the
     match status becomes applied.
AC-6 Given DIGEST_MAX_SCORES=5 and 20 unseen matches When the digest runs Then at most 5 are scored
     and returned.
AC-7 Given an upstream throw whose message contains the Adzuna key When the run fails Then the
     returned message is the fixed string and contains no key.
```

## Test cases

```
TC-1 | integration | file: test/matching.test.ts (new)
Given injected fetch returning an Adzuna page When runSearch Then matches are mapped, non-http URLs
are dropped, and a repeat run adds none (dedup).
TC-2 | core | file: test/digest.test.ts (new)
Given mocked llm score output When rankDigest Then ordering is score desc, the cap is honoured, and
the snippet cap is applied.
TC-3 | route | file: test/match-routes.test.ts (new)
Given no session Then 401; given user B's match When A dismisses Then 404.
TC-4 | integration | file: test/matching.test.ts
Given a secret-bearing URL in an upstream throw When runSearch fails Then the message is fixed and
contains no key.
TC-5 | store | file: test/searchStore.test.ts (new)
Given saved searches and matches for A When listing for B Then [].
```

## Edge cases

- Empty `what` and `where`; reject with the existing "enter a keyword or a place".
- Unsupported country; reject with "unsupported country".
- Page cap (1-50) and query length (200 chars).
- A match whose application is later deleted; `application_id` becomes null via `on delete set null`.
- `ADZUNA_COUNTRY` invalid; default to `us`.
- Duplicate titles with different external ids; allow, since dedup is by source id.
- `fetchPosting` unavailable but `fetchPosting` needed for conversion; create the application with
  URL only and no JD text.

## Out of scope

Other aggregators, SMS or email alerts, recruiter contact, résumé-blind ranking, salary prediction.

## Dependencies

`01`, `02` (scheduling and notifications), `03` (conversion).

## How this beats ResuMax

Digest parity on the user's own API keys, with a transparent rubric and per-match reasons, across any
occupation, at no cost, degrading cleanly to manual. ResuMax's market and digest are vendor-run,
tech-only and tier-gated.
