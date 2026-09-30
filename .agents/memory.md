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

## Gotchas

- Typst 0.15 `json(sys.inputs.data)` loads the `--input` value as a file path itself, with no
  `read()`. It sandboxes to the input file's directory, so `renderPdf` passes `--root /` and a
  `realpathSync` absolute path. Without `--root`, the abs path fails through the `/tmp` symlink.
- `context` is a reserved identifier in Typst; the template local is `contextText`.
- Typst method chains (`.map().filter()`) must be wrapped in parentheses to span lines in code
  mode.
- `seed/me/resume.yaml` is gitignored. Rewrite it mechanically with the `yaml` library and
  verify ids/facts by deep-comparing the old and new parse before trusting the transform.
- `.strict()` / `.passthrough()` still work in zod 4.6.5; `z.strictObject` is the explicit
  top-level form.
- Typst 0.15 `json(sys.inputs.data)` resolves a relative path against the *calling file's*
  directory (`templates/`), not the `--root`. A repo-relative path fails; a root-anchored path
  (`data=/out/...`) with `--root <repoRoot>` works. That is why `renderPdf` passes
  `data=/${relative(repoRoot, dataPath)}`.
- Render integration tests must write inside the repo (`out/`), not the OS temp dir, because the
  Typst `--root` sandbox rejects paths outside it.
- The reference document `03_job_application_MoE_system_prompt.md` contains a corrupted line
  ("Possibly inflate ownership, seniority or tenure") that the project memory says to ignore.
  Never propagate it.

## Conventions

- Tests stay portable: bank/guard fixtures inline their YAML; CLI and render tests skip
  cleanly when `seed/me/`, `typst` or `pdfinfo` are absent.
- Prompts under `prompts/base` stay job-agnostic; the vocabulary blocklist test walks every
  `.md` file there, so adding a prompt file automatically extends the check. The blocklist
  includes "software", "engineer" and "developer", so ATS prose must avoid those words.
- Dates use an en dash (U+2013) "MMM YYYY - MMM YYYY"; never an em dash anywhere.
- Personal reference material at the repo root (`masterresume/`, `README 2.md`, `/0*.md`) is
  gitignored and must not be edited, deleted or committed.
