import { afterEach, describe, expect, it } from 'vitest';
import { completeJson } from '../src/providers/llm.js';
import {
  createMockServer,
  VALID_SCORE,
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

function setFallback(url: string): void {
  process.env.LLM_FALLBACK_BASE_URL = url;
  process.env.LLM_FALLBACK_API_KEY = 'test-key';
  process.env.LLM_FALLBACK_MODEL = 'mock-fallback';
}

afterEach(async () => {
  for (const key of LLM_KEYS) delete process.env[key];
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe('completeJson', () => {
  it('returns parsed JSON on the success path', async () => {
    const primary = await start(() => ({ content: JSON.stringify(VALID_SCORE) }));
    setPrimary(primary.url);
    await expect(completeJson('score', 'sys', 'usr')).resolves.toEqual(VALID_SCORE);
  });

  it('strips markdown code fences', async () => {
    const primary = await start(() => ({
      content: '```json\n' + JSON.stringify(VALID_SCORE) + '\n```',
    }));
    setPrimary(primary.url);
    await expect(completeJson('score', 'sys', 'usr')).resolves.toEqual(VALID_SCORE);
  });

  it('falls back once when the primary returns 500', async () => {
    const primary = await start(() => ({ status: 500 }));
    const fallback = await start(() => ({ content: JSON.stringify(VALID_SCORE) }));
    setPrimary(primary.url);
    setFallback(fallback.url);
    await expect(completeJson('score', 'sys', 'usr')).resolves.toEqual(VALID_SCORE);
  });

  it('falls back once on timeout without waiting for the 90s default', async () => {
    const primary = await start(() => ({ content: JSON.stringify(VALID_SCORE), delayMs: 1000 }));
    const fallback = await start(() => ({ content: JSON.stringify(VALID_SCORE) }));
    setPrimary(primary.url);
    setFallback(fallback.url);
    process.env.LLM_TIMEOUT_MS = '150';
    const started = Date.now();
    await expect(completeJson('score', 'sys', 'usr')).resolves.toEqual(VALID_SCORE);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('surfaces the error when no fallback is configured', async () => {
    const primary = await start(() => ({ status: 503 }));
    setPrimary(primary.url);
    await expect(completeJson('score', 'sys', 'usr')).rejects.toThrow();
  });
});
