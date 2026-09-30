import { describe, expect, it } from 'vitest';
import { ScoreSchema } from '../src/core/schemas.js';

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
