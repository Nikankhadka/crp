# 09 - AI assistant and MCP

## Purpose

Pillar (e): a local stdio MCP server that exposes Career Pilot's stores and pipeline as tools for
ChatGPT, Claude, Codex and the CLI, owner-scoped and dry-run by default.

## Scope

`scripts/mcp.ts` (stdio), the tool registry over the shared service layer `src/server/api.ts`
(`02` `FR-8`), and the identity seam from environment. Optional `api_tokens` is deferred.

## Non-goals

HTTP or SSE transport, remote hosting, OAuth, a public marketplace, multi-user stdio.

## Context

The engine is extensible at the source level: an OpenAI-compatible client, one LLM seam and a CLI
(`src/providers/llm.ts`, `src/cli.ts`). There is no MCP integration. ResuMax ships an MCP bridge into
assistants (see `../competitive-analysis-resumax.md`, section 9). The stdio choice keeps all data
local and avoids a token, CORS and rate-limit surface.

## User stories

- As a user, I point my assistant at the local MCP server and ask it to triage a JD, list my
  applications, or draft outreach.
- As a user, write tools require an explicit confirm parameter; read tools are safe by default.
- As a user, my assistant never sees another user's data and never applies for a job.

## Functional requirements

- FR-1 Reuse the shared service layer `src/server/api.ts` introduced in `02` (`FR-8`). MCP tools are
  thin adapters that call the same service functions the HTTP routes call, so behavior, validation
  and user scoping cannot drift. This spec adds no parallel service layer and no direct store or
  prompt access.
- FR-2 Identity: `CPILOT_USER_EMAIL` (falling back to `OWNER_EMAIL`, then `owner@local`) resolves the
  owner. The server refuses to start when no user resolves.
- FR-3 Read tools (no side effects): `list_applications`, `get_application`, `list_facts`,
  `list_claims`, `list_verification`, `list_material_versions`, `get_digest`, `list_reminders`,
  `list_interview_log`, `score_jd`.
- FR-4 Write tools (gated): `create_application`, `add_note`, `create_reminder`, `log_interview`,
  `start_pipeline`, `run_pipeline_step`. Each takes `confirm: true`; without it the tool returns a
  dry-run preview and writes nothing.
- FR-5 Every tool result is JSON-serializable and carries ids and user scope. Errors are fixed,
  user-safe strings with no stack and no key.
- FR-6 Tools never auto-apply, never message employers, and never confirm a pipeline step; a human
  confirms in the app.
- FR-7 Discovery-backed tools degrade to the fixed "not configured" error from `src/server/
  discovery.ts`; no key is echoed.
- FR-8 The MCP server and its dependency are isolated from the Next build so Next does not bundle
  them.

## Data model changes

None by default. `013_api_tokens` is deferred and not applied:

```sql
-- deferred; only if HTTP MCP is added later
create table api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  token_hash text unique not null,
  label text not null default '',
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
```

Dependency: `@modelcontextprotocol/sdk` as a dev/runtime dependency, isolated from the web bundle. A
hand-rolled minimal stdio JSON-RPC server is the fallback if the dependency is rejected.

## API contract

MCP over stdio: `initialize`, `tools/list`, `tools/call`. `tools/list` returns the read and write
tools above. `tools/call` dispatches by name. Write tools accept `{ ..., confirm: true }`; without
`confirm` the result is `{ dryRun: true, preview }` and no row is written.

| Tool | Type | Input | Output |
|---|---|---|---|
| `list_applications` | read | `{ stage? }` | `{ applications }` |
| `get_application` | read | `{ id }` | `{ application, events }` |
| `score_jd` | read | `{ jd, descriptionIsFull? }` | `{ score }` |
| `list_facts` / `list_claims` / `list_verification` | read | `{}` | `{ ... }` |
| `get_digest` | read | `{ limit? }` | `{ matches }` |
| `create_application` | write | `{ jd?, url?, company?, role?, confirm? }` | `{ application }` or dry run |
| `add_note` | write | `{ applicationId, body, kind?, confirm? }` | `{ note }` or dry run |
| `create_reminder` | write | `{ applicationId, dueAt, message?, confirm? }` | `{ reminder }` or dry run |
| `log_interview` | write | `{ applicationId, stage, format, ..., confirm? }` | `{ entry }` or dry run |
| `start_pipeline` | write | `{ applicationId, jd?, url?, confirm? }` | `{ run }` or dry run |
| `run_pipeline_step` | write | `{ runId, step, confirm? }` | `{ step }` or dry run; never confirms |

## UI surfaces

None in the app. A `/settings` note documents `CPILOT_USER_EMAIL` and the `mcp` launch command.

## Rules and invariants

- The same stores, the same `userId` scoping and the same validators as HTTP. No MCP write bypasses
  `rulesGuard` or `guard`.
- Every tool body is a one-line call into `src/server/api.ts`; a tool that reaches a store, a prompt
  or `src/providers/llm.ts` directly is a defect, not a shortcut.
- The stdio server makes no network call except through the existing LLM and discovery seams, which
  already take injected env.
- A read tool never mutates state; a write tool without `confirm` never mutates state.
- The server never confirms a pipeline step or submits anything on an employer's side.
- Tool output contains no secret, no upstream URL and no other user's data.

## Acceptance criteria

```
AC-1 Given a resolvable user When tools/call list_applications Then only that user's rows return.
AC-2 Given a write tool called without confirm Then no row is written and a dry-run preview returns.
AC-3 Given a write tool called with confirm Then the same service function the HTTP route uses runs.
AC-4 Given an unresolvable user When the server starts Then it exits with a clear message and no
     database write.
AC-5 Given discovery unconfigured When get_digest runs Then the fixed not-configured error returns
     and no key appears in the message.
AC-6 Given run_pipeline_step When called Then it may move a step to awaiting_confirmation but never
     to confirmed.
AC-7 Given user B's application id When user A calls get_application Then 404 or null.
```

## Test cases

```
TC-1 | core | file: test/mcp-tools.test.ts (new)
Given a registry and a freshDb with users A and B When list_applications runs as A Then B's rows are
absent.
TC-2 | core | file: test/mcp-tools.test.ts
Given create_application without confirm When called Then no row exists and a preview returns.
TC-3 | core | file: test/mcp-tools.test.ts
Given create_application with confirm When called Then the shared service created the row and an
application_events row matches the HTTP path.
TC-4 | integration | file: test/mcp-tools.test.ts
Given unconfigured discovery When get_digest runs Then the fixed error and no key in the message.
TC-5 | core | file: test/mcp-tools.test.ts
Given run_pipeline_step When called Then the step status is never confirmed.
```

## Edge cases

- No LLM key; read tools still work and `score_jd` returns a clear provider error.
- Disabled or deleted owner user; the server refuses to start.
- Concurrent write with the web UI; Postgres row locking handles it as it does for routes.
- A tool that would confirm a pipeline step; refused with a fixed message.
- stdio shutdown mid-call; the process exits without corrupting a row (single statement per write).
- Large JD; reject over `MAX_JD_BYTES` with the same message the route uses.

## Out of scope

HTTP/SSE transport, OAuth, token management, multi-user stdio, tool streaming, remote sessions,
marketplace listing.

## Dependencies

`01`, `03`, `05`, `06`, `07`, `08`; a service-seam refactor shared with the route handlers.

## How this beats ResuMax

The same assistant-bridge capability, but local stdio over the user's own database and model keys: no
vendor receives the career record, no account is required, and there is no usage tier. Read tools are
safe and every write is a dry run by default.
