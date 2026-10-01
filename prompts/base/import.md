# Task: turn a resume into a personal bank

The user message holds one resume as plain text inside `<resume>` tags. Convert it into the
person's personal bank. Return JSON only.

This task has no bank and no job advertisement. The resume text is the only source of facts.
Universal rule 1 applies to it: use only what the resume states. Rule 6 applies unchanged.
Rules 2 to 5 and 7 to 14 are about tailoring and do not apply here. In particular, do not
standardise dates, reorder, rewrite, shorten or improve anything.

## Fidelity rules

- Copy every fact exactly as the resume states it: names, employers, titles, institutions,
  credentials, dates, numbers, percentages, links, phone numbers and email addresses. Do not
  round, convert, expand, translate or correct them.
- Never invent an employer, title, date, metric, credential, skill or link. If a field is not
  in the resume, leave the key out. Do not write empty strings or placeholders such as
  "N/A" or "unknown".
- Bullets keep the resume's own wording. You may join a bullet the page layout split across
  lines. Do not merge two bullets, split one, or add words.
- Dates: copy each date as written. Do not complete a missing month or year, and do not
  convert a format. When a range is written as one string, put the part before the separator in
  `start` and the part after it in `end`. A single date that stands alone goes in `start`.
  A role the resume marks as ongoing keeps the resume's word for it (for example "Present") in `end`.
- Anything ambiguous, missing or possibly misread goes in `warnings` as one plain sentence
  naming the entry. Examples: a date range with a missing end, text that looks cut off, two
  conflicting values, a section you could not classify. Prefer a warning over a guess.

## Bank structure

- `basics`: any of `name`, `location`, `phone`, `email`, `linkedin`, `github`, each only when
  the resume states it. No other keys.
- `summaries`: a list of `{ id, text }`. Copy the resume's summary or profile paragraph
  word for word. The bank must contain at least one summary. When the resume has none, write one or
  two plain sentences using only facts the resume states (roles held, employers, years, named
  skills, credentials), with no claims of quality or ambition, and add a warning that the
  summary was drafted and needs review. Never compute durations or totals; copy numbers exactly
  as written.
- `sections`: a list of `{ type, items }`, one section per resume section, in the resume's
  order. `type` is the section name in lowercase kebab-case, for example `experience`,
  `education`, `projects`, `certifications`, `volunteering`. Use the resume's own headings;
  do not rename or merge sections. Each item may use these keys, only when the resume supports
  them:
  - `id` (required)
  - `title`: the role or position held
  - `org`: the employer or organisation, with the location only when it sits on the same line
  - `name`: the name of a project, certification, award or publication
  - `institution` and `credential`: for education and training
  - `context`: a one-line description the resume gives for the entry
  - `start`, `end`: dates as described above
  - `tech`: a list of tools or technologies the entry names
  - `text`: a description for an entry with no bullets, such as an award
  - `bullets`: a list of `{ id, text }`, one per bullet of the entry, in order
- `skills`: a list of `{ id, category, items }`, one group per skills line or heading in the
  resume, `items` being the skills exactly as listed. When the resume lists skills with no
  grouping, use one group with no `category`.
- Leave out `tags` and `track` everywhere.

## Ids

Every `id` in the whole bank is lowercase kebab-case, stable and unique across summaries,
items, bullets and skill groups.

- Summaries: `summary-1`, `summary-2`.
- Items: a short prefix for the section plus a slug of the org, institution or name, for example
  `exp-acme`, `edu-state-university`, `proj-budget-tracker`. When two items would share an id,
  add a number: `exp-acme-2`.
- Bullets: the item id plus `-b` and the bullet number: `exp-acme-b1`, `exp-acme-b2`.
- Skill groups: `skills-` plus a slug of the category, or `skills-1` with no category.

## Profile and personal

- `profile`: an object of settings stated in the resume, only where stated. Allowed keys:
  `targets` (a list of `{ role }` for roles the resume says the person is seeking),
  `region` (an object with `country` and `city` when the resume states them),
  `workRights` (a string when the resume states work authorisation). Return `{}` when the
  resume states none of these. Do not infer a target role from the person's history.
- `personal`: Markdown notes for facts the resume states about the person that do not belong in
  a dated entry, such as languages spoken or availability. Return an empty string when there
  are none.

## Output schema

Return one JSON object with exactly these fields:

```
{
  "profile": {},
  "bank": {
    "basics": { "name": "..." },
    "summaries": [{ "id": "summary-1", "text": "..." }],
    "sections": [
      {
        "type": "experience",
        "items": [
          {
            "id": "exp-acme",
            "title": "...",
            "org": "...",
            "start": "...",
            "end": "...",
            "bullets": [{ "id": "exp-acme-b1", "text": "..." }]
          }
        ]
      }
    ],
    "skills": [{ "id": "skills-1", "category": "...", "items": ["..."] }]
  },
  "personal": "",
  "warnings": ["..."]
}
```

- `warnings` is an array of strings, empty when nothing is uncertain.
- Return no prose, no markdown fences, and no commentary.
