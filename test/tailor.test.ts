import { afterEach, describe, expect, it } from 'vitest';
import { parseBank, type Bank } from '../src/core/bank.js';
import type { Tailored } from '../src/core/schemas.js';
import { tailor } from '../src/core/tailor.js';
import {
  createMockServer,
  type MockHandler,
  type MockServer,
} from './mock-server.js';

const servers: MockServer[] = [];
const LLM_KEYS = [
  'LLM_BASE_URL',
  'LLM_API_KEY',
  'LLM_MODEL',
  'LLM_FALLBACK_BASE_URL',
  'LLM_FALLBACK_API_KEY',
  'LLM_FALLBACK_MODEL',
  'LLM_TIMEOUT_MS',
];

async function start(handler: MockHandler): Promise<MockServer> {
  const server = await createMockServer(handler);
  servers.push(server);
  return server;
}

function setPrimary(url: string): void {
  process.env.LLM_BASE_URL = url;
  process.env.LLM_API_KEY = 'test-key';
  process.env.LLM_MODEL = 'mock-model';
}

const bankText = `
summaries:
  - id: summary-01
    text: Full-stack developer with 20 clients.
experience:
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
  for (const key of LLM_KEYS) delete process.env[key];
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe('tailor', () => {
  it('retries once when the first response fails zod, then returns', async () => {
    let calls = 0;
    const primary = await start(() => {
      calls += 1;
      const content = calls === 1 ? { ...validTailored, summaryRewrite: 'x'.repeat(401) } : validTailored;
      return { content: JSON.stringify(content) };
    });
    setPrimary(primary.url);

    await expect(tailor(input)).resolves.toEqual(validTailored);
    expect(calls).toBe(2);
  });

  it('retries once when the first response fails the guard, then returns', async () => {
    let calls = 0;
    const primary = await start(() => {
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
    setPrimary(primary.url);

    await expect(tailor(input)).resolves.toEqual(validTailored);
    expect(calls).toBe(2);
  });

  it('throws after a second failing attempt with both failures listed', async () => {
    const primary = await start(() => ({
      content: JSON.stringify({ ...validTailored, summaryId: 'nope' }),
    }));
    setPrimary(primary.url);

    await expect(tailor(input)).rejects.toThrow(/validation failed after retry/);
  });
});
