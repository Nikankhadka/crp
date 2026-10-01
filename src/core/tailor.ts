import { completeJson } from '../providers/llm';
import { type Bank } from './bank';
import { guard, type Violation } from './guard';
import { buildPrompt } from './prompt';
import { formatIssues, TailorSchema, type Score, type Tailored } from './schemas';

export interface TailorInput {
  personal: string;
  bank: Bank;
  bankText: string;
  job: string;
  score: Score;
  docs?: string;
  research?: string;
  descriptionIsFull: boolean;
  vocabulary?: string[];
}

interface AttemptResult {
  tailored?: Tailored;
  failure: string;
}

function formatViolations(violations: Violation[]): string {
  return violations.map((violation) => `${violation.rule}: ${violation.message}`).join('; ');
}

/** One validate-then-guard pass. Returns the tailored result or a human-readable failure. */
function attempt(raw: unknown, bank: Bank, vocabulary?: string[]): AttemptResult {
  const parsed = TailorSchema.safeParse(raw);
  if (!parsed.success) return { failure: `schema: ${formatIssues(parsed.error)}` };

  const violations = guard(parsed.data, bank, { vocabulary });
  if (violations.length > 0) return { failure: `guard: ${formatViolations(violations)}` };

  return { tailored: parsed.data, failure: '' };
}

/**
 * Tailor the bank to a job advertisement. Calls completeJson('tailor', system, user), validates
 * with TailorSchema, then runs the anti-fabrication guard. On any zod or guard failure the model
 * is retried once with the failure list appended; if the second attempt fails, both failures are
 * surfaced in one error.
 */
export async function tailor(input: TailorInput): Promise<Tailored> {
  const scoreContext = `score:\n${JSON.stringify(input.score, null, 2)}`;
  const job = input.descriptionIsFull
    ? `${input.job}\n\n${scoreContext}`
    : `${input.job}\n\n[The text above is a snippet, not a full posting.]\n\n${scoreContext}`;

  const { system, user } = buildPrompt({
    task: 'tailor',
    personal: input.personal,
    bank: input.bankText,
    job,
    docs: input.docs,
    research: input.research,
  });

  const first = attempt(await completeJson('tailor', system, user), input.bank, input.vocabulary);
  if (first.tailored) return first.tailored;

  const retryUser = `${user}\n\nThe previous response failed validation. Fix every issue and return JSON that satisfies the schema and the rules exactly:\n${first.failure}`;
  const second = attempt(await completeJson('tailor', system, retryUser), input.bank, input.vocabulary);
  if (second.tailored) return second.tailored;

  throw new Error(
    `Tailoring validation failed after retry. First attempt: ${first.failure}. Second attempt: ${second.failure}`,
  );
}
