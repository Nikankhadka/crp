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
