import { afterEach, describe, expect, it } from 'vitest';
import { score } from '../src/core/score';
import { clearLlmEnv, closeServers, setPrimaryEnv, startServer } from './helpers';
import { VALID_SCORE } from './mock-server';

const input = { personal: 'P', bank: 'B', job: 'J', descriptionIsFull: true };

afterEach(async () => {
  clearLlmEnv();
  await closeServers();
});

describe('score', () => {
  it('retries exactly once when the first response is invalid', async () => {
    let calls = 0;
    const primary = await startServer(() => {
      calls += 1;
      const content = calls === 1 ? { ...VALID_SCORE, score: 200 } : VALID_SCORE;
      return { content: JSON.stringify(content) };
    });
    setPrimaryEnv(primary.url);

    await expect(score(input)).resolves.toEqual(VALID_SCORE);
    expect(calls).toBe(2);
  });

  it('throws after a second invalid response', async () => {
    let calls = 0;
    const primary = await startServer(() => {
      calls += 1;
      return { content: JSON.stringify({ ...VALID_SCORE, score: 200 }) };
    });
    setPrimaryEnv(primary.url);

    await expect(score(input)).rejects.toThrow(/validation failed after retry/);
    expect(calls).toBe(2);
  });
});
