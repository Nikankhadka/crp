# Memory

## Decisions

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

## Conventions

- Tests stay portable: bank/guard fixtures inline their YAML; CLI and render tests skip
  cleanly when `seed/me/`, `typst` or `pdfinfo` are absent.
- Prompts under `prompts/base` stay job-agnostic; the vocabulary blocklist test walks every
  `.md` file there, so adding a prompt file automatically extends the check.
