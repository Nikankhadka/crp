# Task: tailor the bank to a job advertisement

Produce a tailored resume selection from the personal bank. Return JSON only.

## Selection rules

- Select bullets by id only, and only from the bank. Never write a bullet that has no
  `sourceId` from the bank.
- Reword lightly for the target job. Keep the meaning, the claims and the numbers of the
  source bullet; do not add a claim the source bullet does not make.
- Every bullet must carry the `sourceId` of the bank bullet it came from.
- Choose the summary by `summaryId` and rewrite it lightly, with the same rules as bullets.
- `skillsOrder` may only reorder skills that already exist in the bank. Never add a skill.
- List every requirement in the advertisement the bank does not evidence under `gaps`.
  Do not invent evidence to fill a gap.
- When a `<docs>` block is present it is background reference only. Use it to choose which
  bank facts to foreground and how to phrase them; never take a fact, figure, date or claim
  from it, and never let it change a bullet's meaning or numbers.

## Personal layer

- The personal layer is authoritative. Obey its never-mention list: never output a listed
  term, even when the advertisement names it.
- Obey its verification-queue rule: leave out any bank fact tagged `verify` until it is
  resolved.
- Obey its preferred section order; it overrides the default order below.

## Section order and length

- When a research brief is present, follow the section order and length it states.
- When there is no research brief, use this default order and length: summary, experience,
  projects, education, skills, unless the personal layer states a different preferred order,
  which wins. Prefer the most recent and most relevant experience; keep the tailored resume
  to at most two pages, and each role to at most five bullets.

## Numbers and vocabulary

- Every number in a rewritten bullet or summary must come from the source bullet or summary
  it cites. Do not round, scale or invent a number, percentage or suffix.
- Use wording and conventions from the advertisement and the research brief only where the
  bank confirms the experience. Do not assume conventions that are not stated.

## Output schema

Return one JSON object with exactly these fields:

```
{
  "summaryId": "bank-summary-id",
  "summaryRewrite": "at most 400 characters",
  "sections": [
    {
      "type": "experience",
      "items": [
        {
          "itemId": "bank-item-id",
          "bullets": [{ "sourceId": "bank-bullet-id", "text": "at most 220 characters" }]
        }
      ]
    }
  ],
  "skillsOrder": ["skill as written in the bank"],
  "gaps": ["requirement the bank does not evidence"],
  "coverLetter": "optional, at most 1800 characters"
}
```

- `summaryId`: id of a bank summary.
- `summaryRewrite`: string, at most 400 characters.
- `sections`: array of `{ type, items }`; `type` is a section name such as the ones in the
  default order. Each item has an `itemId` from the bank and at most five bullets.
- Each bullet has a `sourceId` from the bank and `text` of at most 220 characters.
- `skillsOrder`: skills as written in the bank, reordered only.
- `gaps`: array of strings.
- `coverLetter`: optional string, at most 1800 characters.
