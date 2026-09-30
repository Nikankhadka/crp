import { describe, expect, it } from 'vitest';
import { ScoreSchema, TailorSchema } from '../src/core/schemas.js';

const valid = {
  score: 80,
  seniorityFit: 'match',
  mustHavesMet: ['JavaScript'],
  mustHavesMissing: [],
  keywordsToMirror: ['REST APIs'],
  redFlags: [],
  oneLineWhy: 'Good overlap.',
};

describe('ScoreSchema', () => {
  it('accepts a valid object', () => {
    expect(ScoreSchema.parse(valid)).toEqual(valid);
  });

  it('rejects an out-of-range score', () => {
    expect(ScoreSchema.safeParse({ ...valid, score: 101 }).success).toBe(false);
    expect(ScoreSchema.safeParse({ ...valid, score: -1 }).success).toBe(false);
    expect(ScoreSchema.safeParse({ ...valid, score: 70.5 }).success).toBe(false);
  });

  it('rejects a missing field', () => {
    const { oneLineWhy: _dropped, ...missing } = valid;
    expect(ScoreSchema.safeParse(missing).success).toBe(false);
  });

  it('rejects a bad enum and an over-long keywords list', () => {
    expect(ScoreSchema.safeParse({ ...valid, seniorityFit: 'sideways' }).success).toBe(false);
    expect(
      ScoreSchema.safeParse({ ...valid, keywordsToMirror: Array(16).fill('x') }).success,
    ).toBe(false);
  });
});

const validTailored = {
  summaryId: 'summary-01',
  summaryRewrite: 'Full-stack developer.',
  sections: [
    {
      type: 'experience',
      items: [
        { itemId: 'exp-one', bullets: [{ sourceId: 'exp-one-01', text: 'Built a platform.' }] },
      ],
    },
  ],
  skillsOrder: ['TypeScript'],
  gaps: [],
};

describe('TailorSchema', () => {
  it('accepts a valid object without a cover letter', () => {
    expect(TailorSchema.parse(validTailored)).toEqual(validTailored);
  });

  it('accepts an optional cover letter', () => {
    const withLetter = { ...validTailored, coverLetter: 'Dear team,' };
    expect(TailorSchema.parse(withLetter)).toEqual(withLetter);
  });

  it('rejects a summaryRewrite over 400 characters', () => {
    expect(
      TailorSchema.safeParse({ ...validTailored, summaryRewrite: 'x'.repeat(401) }).success,
    ).toBe(false);
  });

  it('rejects a bullet text over 220 characters', () => {
    const section = {
      type: 'experience',
      items: [{ itemId: 'exp-one', bullets: [{ sourceId: 'exp-one-01', text: 'x'.repeat(221) }] }],
    };
    expect(TailorSchema.safeParse({ ...validTailored, sections: [section] }).success).toBe(false);
  });

  it('rejects more than 5 bullets in an item', () => {
    const bullets = Array.from({ length: 6 }, (_, i) => ({ sourceId: `b-${i}`, text: 'x' }));
    const section = { type: 'experience', items: [{ itemId: 'exp-one', bullets }] };
    expect(TailorSchema.safeParse({ ...validTailored, sections: [section] }).success).toBe(false);
  });

  it('rejects a cover letter over 1800 characters', () => {
    expect(
      TailorSchema.safeParse({ ...validTailored, coverLetter: 'x'.repeat(1801) }).success,
    ).toBe(false);
  });
});
