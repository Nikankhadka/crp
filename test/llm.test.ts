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
  'OPENCODE_API_KEY',
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

  it('defaults to the free Zen model when only OPENCODE_API_KEY is set', async () => {
    let seenModel: unknown;
    const primary = await start((body) => {
      seenModel = (body as { model?: unknown }).model;
      return { content: JSON.stringify(VALID_SCORE) };
    });
    process.env.LLM_BASE_URL = primary.url;
    process.env.OPENCODE_API_KEY = 'test-key';
    await expect(completeJson('score', 'sys', 'usr')).resolves.toEqual(VALID_SCORE);
    expect(seenModel).toBe('nemotron-3.5-lightning-free');
  });

  it('lets explicit LLM_MODEL and LLM_BASE_URL override the defaults', async () => {
    let seenModel: unknown;
    const primary = await start((body) => {
      seenModel = (body as { model?: unknown }).model;
      return { content: JSON.stringify(VALID_SCORE) };
    });
    process.env.LLM_BASE_URL = primary.url;
    process.env.OPENCODE_API_KEY = 'test-key';
    process.env.LLM_MODEL = 'custom-model';
    await expect(completeJson('score', 'sys', 'usr')).resolves.toEqual(VALID_SCORE);
    expect(seenModel).toBe('custom-model');
  });

  it('names both accepted key env vars when no key is configured', async () => {
    delete process.env.LLM_API_KEY;
    delete process.env.OPENCODE_API_KEY;
    await expect(completeJson('score', 'sys', 'usr')).rejects.toThrow(
      'Missing LLM_API_KEY or OPENCODE_API_KEY',
    );
  });

  it('activates the fallback from LLM_FALLBACK_MODEL and reuses the primary URL and key', async () => {
    let seenAuth: string | undefined;
    const primary = await start((_body, callIndex, headers) => {
      seenAuth = headers.authorization;
      return callIndex === 0 ? { status: 500 } : { content: JSON.stringify(VALID_SCORE) };
    });
    process.env.LLM_BASE_URL = primary.url;
    process.env.LLM_API_KEY = 'primary-key';
    process.env.LLM_FALLBACK_MODEL = 'mock-fallback';
    await expect(completeJson('score', 'sys', 'usr')).resolves.toEqual(VALID_SCORE);
    expect(seenAuth).toBe('Bearer primary-key');
  });

  it('uses LLM_FALLBACK_API_KEY when provided', async () => {
    const primary = await start(() => ({ status: 500 }));
    let fallbackAuth: string | undefined;
    const fallback = await start((_body, _call, headers) => {
      fallbackAuth = headers.authorization;
      return { content: JSON.stringify(VALID_SCORE) };
    });
    setPrimary(primary.url);
    process.env.LLM_FALLBACK_BASE_URL = fallback.url;
    process.env.LLM_FALLBACK_MODEL = 'mock-fallback';
    process.env.LLM_FALLBACK_API_KEY = 'fallback-key';
    await expect(completeJson('score', 'sys', 'usr')).resolves.toEqual(VALID_SCORE);
    expect(fallbackAuth).toBe('Bearer fallback-key');
  });

  it('surfaces a retryable failure and makes one request when no fallback is configured', async () => {
    let requests = 0;
    const primary = await start(() => {
      requests += 1;
      return { status: 503 };
    });
    setPrimary(primary.url);
    await expect(completeJson('score', 'sys', 'usr')).rejects.toThrow();
    expect(requests).toBe(1);
  });
});
