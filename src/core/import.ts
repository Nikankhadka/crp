import { stringify } from 'yaml';
import { z } from 'zod';
import { completeJson } from '../providers/llm';
import { BankSchema, parseBank } from './bank';
import { numbers } from './guard';
import { loadSystem } from './prompt';
import { formatIssues } from './schemas';

const ImportSchema = z.object({
  profile: z.record(z.string(), z.unknown()).default({}),
  bank: BankSchema,
  personal: z.string().default(''),
  warnings: z.array(z.string()).default([]),
});

type ImportOutput = z.infer<typeof ImportSchema>;

/** The three bank documents as editable text, plus anything the model was unsure about. */
export interface ImportDraft {
  profileYaml: string;
  resumeYaml: string;
  personalMd: string;
  warnings: string[];
}

/** The model could not produce a valid, faithful bank, even after one retry. */
export class ImportValidationError extends Error {}

export interface ImportDeps {
  completeJson: typeof completeJson;
}

// Keys whose strings are ours, not the resume's: ids carry digits we chose.
const NON_FACT_KEYS = new Set(['id', 'tags', 'track']);

// Numbers count too: a passthrough field such as `yearsExperience: 15` is a fact the resume must state.
function collectStrings(value: unknown, into: string[]): void {
  if (typeof value === 'string') into.push(value);
  else if (typeof value === 'number') into.push(String(value));
  else if (Array.isArray(value)) for (const entry of value) collectStrings(entry, into);
  else if (value !== null && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) if (!NON_FACT_KEYS.has(key)) collectStrings(entry, into);
  }
}

function duplicateIds(bank: ImportOutput['bank']): string[] {
  const ids = [
    ...bank.summaries.map((entry) => entry.id),
    ...bank.skills.map((entry) => entry.id),
    ...bank.sections.flatMap((section) =>
      section.items.flatMap((item) => [item.id, ...(item.bullets ?? []).map((bullet) => bullet.id)]),
    ),
  ];
  return ids.filter((id, index) => ids.indexOf(id) !== index);
}

const normalise = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Names, employers, titles and credentials the model wrote that the resume text does not contain. */
function ungroundedNames(bank: ImportOutput['bank'], source: string): string[] {
  const haystack = ` ${normalise(source)} `;
  const names = [
    bank.basics.name,
    ...bank.sections.flatMap((section) =>
      section.items.flatMap((item) => [item.title, item.org, item.institution, item.credential, item.name]),
    ),
  ];
  return [...new Set(names.filter((name): name is string => typeof name === 'string'))]
    .filter((name) => normalise(name) !== '' && !haystack.includes(` ${normalise(name)} `))
    .map((name) => `"${name}" was not found word for word in your resume text. Check it.`);
}

interface Attempt {
  draft?: ImportDraft;
  failure: string;
}

/** One validate pass: schema, at least one summary, unique ids, no number the resume lacks. */
function attempt(raw: unknown, source: string): Attempt {
  const parsed = ImportSchema.safeParse(raw);
  if (!parsed.success) return { failure: `schema: ${formatIssues(parsed.error)}` };
  const { profile, bank, personal, warnings } = parsed.data;

  if (bank.summaries.length === 0) return { failure: 'bank: at least one summary is required' };
  const duplicates = duplicateIds(bank);
  if (duplicates.length > 0) return { failure: `ids: duplicate id(s) ${[...new Set(duplicates)].join(', ')}` };

  const texts: string[] = [];
  collectStrings(bank, texts);
  collectStrings(profile, texts);
  texts.push(personal);
  const known = numbers(source);
  const invented = [...numbers(texts.join('\n'))].filter((value) => !known.has(value));
  if (invented.length > 0) {
    return { failure: `number: ${invented.slice(0, 10).join(', ')} not present in the resume text` };
  }

  // Save what a generation run will read, so check that exact text parses.
  const resumeYaml = stringify(bank);
  try {
    parseBank(resumeYaml);
  } catch (err) {
    return { failure: `bank: ${err instanceof Error ? err.message : String(err)}` };
  }

  return {
    draft: {
      profileYaml: stringify({ ...profile, pageTarget: 1 }),
      resumeYaml,
      personalMd: personal,
      warnings: [...warnings, ...ungroundedNames(bank, source)],
    },
    failure: '',
  };
}

/**
 * Turn resume text into a draft bank with one model call (and one retry that appends the
 * failures, like score and tailor). The draft is never saved here: the user reviews and edits it
 * first. Throws ImportValidationError when both attempts fail validation; provider errors from
 * completeJson propagate unchanged.
 */
export async function importBank(resumeText: string, deps: Partial<ImportDeps> = {}): Promise<ImportDraft> {
  const complete = deps.completeJson ?? completeJson;
  const system = loadSystem('import');
  const user = `<resume>\n${resumeText}\n</resume>`;

  const first = attempt(await complete('import', system, user), resumeText);
  if (first.draft) return first.draft;

  const retryUser = `${user}\n\nThe previous response failed validation. Fix every issue and return JSON that satisfies the schema and the rules exactly:\n${first.failure}`;
  const second = attempt(await complete('import', system, retryUser), resumeText);
  if (second.draft) return second.draft;

  throw new ImportValidationError(
    `Could not turn the resume into a valid bank. First attempt: ${first.failure}. Second attempt: ${second.failure}`,
  );
}
