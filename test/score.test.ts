import { afterEach, describe, expect, it } from 'vitest';
import { score } from '../src/core/score.js';
import {
  createMockServer,
  VALID_SCORE,
  type MockHandler,
  type MockServer,
} from './mock-server.js';

const servers: MockServer[] = [];
const LLM_KEYS = ['LLM_BASE_URL', 'LLM_API_KEY', 'LLM_MODEL', 'LLM_FALLBACK_BASE_URL', 'LLM_FALLBACK_API_KEY', 'LLM_FALLBACK_MODEL', 'LLM_TIMEOUT_MS'];

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

const input = { personal: 'P', bank: 'B', job: 'J', descriptionIsFull: true };

afterEach(async () => {
  for (const key of LLM_KEYS) delete process.env[key];
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe('score', () => {
  it('retries exactly once when the first response is invalid', async () => {
    let calls = 0;
    const primary = await start(() => {
      calls += 1;
      const content = calls === 1 ? { ...VALID_SCORE, score: 200 } : VALID_SCORE;
      return { content: JSON.stringify(content) };
    });
    setPrimary(primary.url);

    await expect(score(input)).resolves.toEqual(VALID_SCORE);
    expect(calls).toBe(2);
  });

  it('throws after a second invalid response', async () => {
    let calls = 0;
    const primary = await start(() => {
      calls += 1;
      return { content: JSON.stringify({ ...VALID_SCORE, score: 200 }) };
    });
    setPrimary(primary.url);

    await expect(score(input)).rejects.toThrow(/validation failed after retry/);
    expect(calls).toBe(2);
  });
});
