# Memory

## Decisions

- Seed rebuilt from `masterresume/masterresume.md` plus the `07_project_memory_notes.md`
  standing corrections (Eight Bit ends Feb 2025, MeroGhar ~94% on key routes, AgenCx live on
  Vercel with AWS Terraform dormant, Paypipe ~70% hedged). `profile.targets` is now a list of
  `{ role, track }` so tech and care targets stay distinguishable.
- `GuardOptions.neverMention` mirrors `vocabulary`: the caller supplies the term list and the
  guard checks containment in the rewrite against its source or the bank skills. It is not yet
  wired from `profile.exclusions` in the CLI (same as `vocabulary`); the prompt layer carries
  the never-mention enforcement.
- Bank schema: `z.strictObject` at the top level so a misplaced key errors loudly; basics,
  items, summaries and skills use `.passthrough()` so extra facts survive.
- `mergeResume` resolves org/title/name/credential/dates/tech from the bank; only bullet text
  and the summary rewrite come from the model. A tampered model field cannot leak.
- `renderOnePage(doc, outDir, maxPasses, deps)` takes `render` and `pageCount` as injectable
  deps so the shrink loop is unit-testable without Typst. The initial render is not a pass.
- Render output goes to `out/local/<jd-slug>/v1/` (gitignored). `data/` and `output/` are
  never touched.
- LLM provider defaults to the free OpenCode Zen gateway: base URL
  `https://opencode.ai/zen/v1`, primary model `nemotron-3.5-lightning-free`, fallback model
  `nemotron-3-ultra-free`. A single key is enough via `LLM_API_KEY` or its `OPENCODE_API_KEY`
  alias. The fallback is active only when `LLM_FALLBACK_MODEL` or `LLM_FALLBACK_BASE_URL` is
  set; its base URL and key default to the effective primary. Explicit env always overrides.
- Maintenance pass: removed four unused `z.infer` bank types (`BankSection`, `BankBullet`,
  `BankSummary`, `BankSkillGroup`) and consolidated the duplicated zod-issue formatter into
  `formatIssues` in `src/core/schemas.ts`. This repo has no dead-code tooling (no
  knip/depcheck/eslint), so detection is manual: grep each export across `src` and
  `test`, then confirm there is no dynamic `import()`/`require()` before deleting.
- Discovery slice: Adzuna search (`/discover`) and Firecrawl posting import (`/new`) are optional
  and configured by env, with `discoveryConfig` treating unset and `replace-me` as off. Every
  upstream failure becomes a fixed message, never the upstream body or URL, because the Adzuna
  app id and key travel in the request URL. Both client/server limits live in `src/core/limits.ts`
  (`MAX_JD_BYTES`) and `src/core/truncate.ts` (`truncateToBytes`, also used for the prompt docs
  budget), so the browser and server agree on the caps.

## Gotchas

- Typst 0.15 `json(sys.inputs.data)` loads the `--input` value as a file path itself, with no
  `read()`, and sandboxes to `--root`.
- `context` is a reserved identifier in Typst; the template local is `contextText`.
- Typst method chains (`.map().filter()`) must be wrapped in parentheses to span lines in code
  mode.
- `seed/me/resume.yaml` is gitignored. Rewrite it mechanically with the `yaml` library and
  verify ids/facts by deep-comparing the old and new parse before trusting the transform.
- `.strict()` / `.passthrough()` still work in zod 4.6.5; `z.strictObject` is the explicit
  top-level form.
- Typst 0.15 `json(sys.inputs.data)` resolves a relative path against the *calling file's*
  directory, not the `--root`; a root-anchored path works. So `renderPdf` copies the template into
  `outDir` as `resume.typ` and compiles with `--root outDir` and `data=/resume.json`. Rendering
  therefore works from any writable dir (the OS temp dir on a read-only serverless deploy).
- Page counting uses `pdf-lib` (pure JS); no system PDF tool is needed. The linux typst binary
  comes from `scripts/fetch-typst.mjs` (pinned version and sha256) into gitignored `bin/`, and
  `resolveTypstBin` copies it to the OS temp dir and chmods it because the deploy fs is read-only.
- The reference document `03_job_application_MoE_system_prompt.md` contains a corrupted line
  ("Possibly inflate ownership, seniority or tenure") that the project memory says to ignore.
  Never propagate it.
- Retired or unsupported Zen free models: `deepseek-v4-flash-free` (promotion ended, live calls
  return "Model is unavailable") and `muse-spark-1.3-contributor-free` (Responses-API only, and
  its free tier trains on prompts/completions). The free pool rotates, so keep the fallback path
  and switch models by env, not code.
- `test/mock-server.ts` `MockHandler` receives request `headers` as its third argument
  (`IncomingHttpHeaders`); existing handlers taking 0-2 args stay assignable. Use it to assert
  the `Authorization: Bearer` key selection.
- This checkout can have concurrent tooling that commits to `feat/weekend1-core-pipeline` and
  switches the checked-out branch mid-session. Re-check `git branch --show-current` and
  `git status` before staging, and base a new feature branch on the current HEAD so already
  committed WIP is not re-included in the new commit. It can also stop mid-refactor: after the
  user-scoped store migration, `bootstrap.importDocs` briefly called `upsertDoc` without its
  leading `userId` (and without `await`), which `tsc` caught. When stores change shape, check
  every caller, especially bootstrap.
- There is no `CONTEXT.md` or ADR directory. Domain and architecture notes live in
  `.agents/memory.md`, `README.md` and `AGENTS.md`; keep those current instead.

## Conventions

- Tests stay portable: bank/guard fixtures inline their YAML; CLI and render tests skip
  cleanly when `seed/me/` or `typst` are absent.
- Prompts under `prompts/base` stay job-agnostic; the vocabulary blocklist test walks every
  `.md` file there, so adding a prompt file automatically extends the check. The blocklist
  includes "software", "engineer" and "developer", so ATS prose must avoid those words.
- Dates use an en dash (U+2013) "MMM YYYY - MMM YYYY"; never an em dash anywhere.
- Personal reference material at the repo root (`masterresume/`, `README 2.md`, `/0*.md`) is
  gitignored and must not be edited, deleted or committed.
- Shared test support lives in `test/helpers.ts`: use `startServer`/`closeServers`,
  `setPrimaryEnv`/`clearLlmEnv` and `hasCommand` instead of re-declaring them per test file.
  `LLM_ENV_KEYS` includes `OPENCODE_API_KEY` so no provider env var leaks between tests.
