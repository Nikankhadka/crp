import { parse } from 'yaml';
import { z } from 'zod';

/**
 * Schema for the seed resume bank (seed/me/resume.yaml). It mirrors the real file: every
 * item and bullet carries an `id`, and most entries are loosely typed so the bank can hold
 * both tech and non-tech tracks. Unknown keys are ignored so the bank may grow without
 * breaking the parser.
 */
const BulletSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  tags: z.array(z.string()).optional(),
});

const ItemSchema = z.object({
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
  bullets: z.array(BulletSchema).optional(),
});

const SummarySchema = z.object({
  id: z.string().min(1),
  track: z.string().optional(),
  tags: z.array(z.string()).optional(),
  text: z.string(),
});

const CertificationSchema = z.object({
  id: z.string().min(1),
  track: z.string().optional(),
  tags: z.array(z.string()).optional(),
  name: z.string(),
  notes: z.array(BulletSchema).optional(),
});

const SkillGroupSchema = z.object({
  id: z.string().min(1),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  items: z.array(z.string()).optional(),
  text: z.string().optional(),
});

const AwardSchema = z.object({
  id: z.string().min(1),
  tags: z.array(z.string()).optional(),
  title: z.string(),
  text: z.string().optional(),
});

export const BankSchema = z.object({
  basics: z
    .object({
      name: z.string().optional(),
      location: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      linkedin: z.string().optional(),
      github: z.string().optional(),
    })
    .default({}),
  summaries: z.array(SummarySchema).default([]),
  experience: z.array(ItemSchema).default([]),
  projects: z.array(ItemSchema).default([]),
  education: z.array(ItemSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
  skills: z.array(SkillGroupSchema).default([]),
  awards: z.array(AwardSchema).default([]),
});

export type Bank = z.infer<typeof BankSchema>;
export type BankItem = z.infer<typeof ItemSchema>;
export type BankBullet = z.infer<typeof BulletSchema>;

/** Parse and validate a resume bank from raw YAML text. Throws on malformed YAML or shape. */
export function parseBank(yamlText: string): Bank {
  return BankSchema.parse(parse(yamlText));
}
