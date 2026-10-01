import { z, type ZodError } from 'zod';

export const ScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  seniorityFit: z.enum(['under', 'match', 'over']),
  mustHavesMet: z.array(z.string()),
  mustHavesMissing: z.array(z.string()),
  keywordsToMirror: z.array(z.string()).max(15),
  redFlags: z.array(z.string()),
  oneLineWhy: z.string().max(200),
});

export type Score = z.infer<typeof ScoreSchema>;

export const TailorSchema = z.object({
  summaryId: z.string(),
  summaryRewrite: z.string().max(400),
  sections: z.array(
    z.object({
      type: z.string(),
      items: z.array(
        z.object({
          itemId: z.string(),
          bullets: z
            .array(
              z.object({
                sourceId: z.string(),
                text: z.string().max(220),
              }),
            )
            .max(5),
        }),
      ),
    }),
  ),
  skillsOrder: z.array(z.string()),
  gaps: z.array(z.string()),
  coverLetter: z.string().max(1800).optional(),
});

export type Tailored = z.infer<typeof TailorSchema>;

/** Flatten zod issues into one `path: message; ...` string for retry prompts and errors. */
export function formatIssues(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}
