import { ZodError } from 'zod';
import { completeJson } from '../providers/llm.js';
import { buildPrompt } from './prompt.js';
import { ScoreSchema, type Score } from './schemas.js';

export interface ScoreInput {
  personal: string;
  bank: string;
  job: string;
  descriptionIsFull: boolean;
  research?: string;
}

function formatIssues(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}

/**
 * Score a job advertisement against the personal layer. On schema failure the model is
 * retried once with the zod issues appended, then the error is surfaced.
 */
export async function score(input: ScoreInput): Promise<Score> {
  const job = input.descriptionIsFull
    ? input.job
    : `${input.job}\n\n[The text above is a snippet, not a full posting. Apply the snippet cap.]`;

  const { system, user } = buildPrompt({
    task: 'score',
    personal: input.personal,
    bank: input.bank,
    job,
    research: input.research,
  });

  const first = ScoreSchema.safeParse(await completeJson('score', system, user));
  if (first.success) return first.data;

  const retryUser = `${user}\n\nThe previous response failed validation: ${formatIssues(
    first.error,
  )}. Return JSON that satisfies the schema exactly.`;
  const second = ScoreSchema.safeParse(await completeJson('score', system, retryUser));
  if (second.success) return second.data;

  throw new Error(
    `Score validation failed after retry: ${JSON.stringify(second.error.issues)}`,
  );
}
