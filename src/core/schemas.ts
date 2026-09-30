import { z } from 'zod';

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
