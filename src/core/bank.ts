import { parse } from 'yaml';
import { z } from 'zod';

/**
 * Schema for the seed resume bank (seed/me/resume.yaml). The bank is job-agnostic: a person
 * may need any sections (`sections` is a free-form list), so only the ids, bullet shape and
 * summary/skill shape are fixed. Item, summary, skill and basics objects pass unknown keys
 * through, so extra facts survive; the top level is strict so a misplaced top-level key
 * errors loudly instead of silently vanishing.
 */
const BulletSchema = z
  .object({
    id: z.string().min(1),
    text: z.string(),
    tags: z.array(z.string()).optional(),
  })
  .passthrough();

const ItemSchema = z
  .object({
    id: z.string().min(1),
    track: z.string().optional(),
    tags: z.array(z.string()).optional(),
    title: z.string().optional(),
    org: z.string().optional(),
    name: z.string().optional(),
    institution: z.string().optional(),
    credential: z.string().optional(),
    context: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    tech: z.array(z.string()).optional(),
    /** Item-level fact for bullet-less entries (for example an award description). */
    text: z.string().optional(),
    bullets: z.array(BulletSchema).optional(),
  })
  .passthrough();

const SectionSchema = z.object({
  type: z.string().min(1),
  items: z.array(ItemSchema).default([]),
});

const SummarySchema = z
  .object({
    id: z.string().min(1),
    track: z.string().optional(),
    tags: z.array(z.string()).optional(),
    text: z.string(),
  })
  .passthrough();

const SkillGroupSchema = z
  .object({
    id: z.string().min(1),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    items: z.array(z.string()).optional(),
    text: z.string().optional(),
  })
  .passthrough();

export const BankSchema = z.strictObject({
  basics: z
    .object({
      name: z.string().optional(),
      location: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      linkedin: z.string().optional(),
      github: z.string().optional(),
    })
    .passthrough()
    .default({}),
  summaries: z.array(SummarySchema).default([]),
  sections: z.array(SectionSchema).default([]),
  skills: z.array(SkillGroupSchema).default([]),
});

export type Bank = z.infer<typeof BankSchema>;
export type BankSection = z.infer<typeof SectionSchema>;
export type BankItem = z.infer<typeof ItemSchema>;
export type BankBullet = z.infer<typeof BulletSchema>;
export type BankSummary = z.infer<typeof SummarySchema>;
export type BankSkillGroup = z.infer<typeof SkillGroupSchema>;

/** Parse and validate a resume bank from raw YAML text. Throws on malformed YAML or shape. */
export function parseBank(yamlText: string): Bank {
  return BankSchema.parse(parse(yamlText));
}
