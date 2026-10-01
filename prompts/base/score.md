# Task: score a job advertisement

Score the job advertisement against the personal layer. Return JSON only.

## Rubric (100 points total)

- 40 points: required skills, credentials and licences the advertisement states as
  required, and how many the personal layer evidences.
- 20 points: seniority fit, comparing the advertised level with the personal layer's
  stated level.
- 15 points: domain or product fit.
- 15 points: location and work rights, using only what the advertisement states.
- 10 points: nice-to-haves.

## Rules

- Compare only against facts in the personal layer. Do not assume anything not stated.
- When a `<docs>` block is present it is background reference only. It may inform which
  strengths to emphasise and how to phrase `oneLineWhy`, but never add, change or score a
  fact; every fact still comes from the personal layer.
- Roles that require citizenship, permanent residency (PR) or a security clearance are hard
  blockers. So are roles whose hard requirements are all in the personal layer's
  never-mention list. State the blocker in both `redFlags` and `mustHavesMissing` and score
  the role down. Never count a never-mention item as met.
- If the advertisement is a snippet or partial description rather than a full posting,
  cap the score at 75 and record that in `redFlags`.
- Report what is missing. Do not fill gaps with plausible guesses.
- `keywordsToMirror` lists at most 15 terms from the advertisement worth mirroring where
  the personal layer supports them.
- `redFlags` lists genuine concerns, including a partial description.
- `oneLineWhy` is at most 200 characters.

## Output schema

Return one JSON object with exactly these fields:

```
{
  "score": 0,
  "seniorityFit": "under",
  "mustHavesMet": ["..."],
  "mustHavesMissing": ["..."],
  "keywordsToMirror": ["..."],
  "redFlags": ["..."],
  "oneLineWhy": "..."
}
```

- `score`: integer from 0 to 100.
- `seniorityFit`: one of `"under"`, `"match"`, `"over"`.
- `mustHavesMet`: array of strings.
- `mustHavesMissing`: array of strings.
- `keywordsToMirror`: array of strings, at most 15.
- `redFlags`: array of strings.
- `oneLineWhy`: string, at most 200 characters.
