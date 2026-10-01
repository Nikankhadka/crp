import { afterEach, describe, expect, it } from 'vitest';
import { parseBank, type Bank } from '../src/core/bank';
import type { Tailored } from '../src/core/schemas';
import { tailor } from '../src/core/tailor';
import { clearLlmEnv, closeServers, setPrimaryEnv, startServer } from './helpers';

const bankText = `
summaries:
  - id: summary-01
    text: Full-stack developer with 20 clients.
sections:
  - type: experience
    items:
      - id: exp-one
        title: Developer
        org: Example Co
        bullets:
          - id: exp-one-01
            text: Built a platform used by about 20 clients.
skills:
  - id: skill-tech
    items: [TypeScript]
`;
const bank: Bank = parseBank(bankText);

const validTailored: Tailored = {
  summaryId: 'summary-01',
  summaryRewrite: 'Full-stack developer serving 20 clients.',
  sections: [
    {
      type: 'experience',
      items: [
        { itemId: 'exp-one', bullets: [{ sourceId: 'exp-one-01', text: 'Built a platform used by about 20 clients.' }] },
      ],
    },
  ],
  skillsOrder: ['TypeScript'],
  gaps: [],
};

const input = {
  personal: 'P',
  bank,
  bankText,
  job: 'J',
  score: { score: 80 } as never,
  descriptionIsFull: true,
};

afterEach(async () => {
  clearLlmEnv();
  await closeServers();
});

describe('tailor', () => {
  it('retries once when the first response fails zod, then returns', async () => {
    let calls = 0;
    const primary = await startServer(() => {
      calls += 1;
      const content = calls === 1 ? { ...validTailored, summaryRewrite: 'x'.repeat(401) } : validTailored;
      return { content: JSON.stringify(content) };
    });
    setPrimaryEnv(primary.url);

    await expect(tailor(input)).resolves.toEqual(validTailored);
    expect(calls).toBe(2);
  });

  it('retries once when the first response fails the guard, then returns', async () => {
    let calls = 0;
    const primary = await startServer(() => {
      calls += 1;
      const content =
        calls === 1
          ? {
              ...validTailored,
              sections: [
                {
                  type: 'experience',
                  items: [
                    { itemId: 'exp-one', bullets: [{ sourceId: 'nope', text: 'Built a platform used by about 20 clients.' }] },
                  ],
                },
              ],
            }
          : validTailored;
      return { content: JSON.stringify(content) };
    });
    setPrimaryEnv(primary.url);

    await expect(tailor(input)).resolves.toEqual(validTailored);
    expect(calls).toBe(2);
  });

  it('throws after a second failing attempt with both failures listed', async () => {
    const primary = await startServer(() => ({
      content: JSON.stringify({ ...validTailored, summaryId: 'nope' }),
    }));
    setPrimaryEnv(primary.url);

    await expect(tailor(input)).rejects.toThrow(/validation failed after retry/);
  });
});
