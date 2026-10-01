import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { completeJson } from '../src/providers/llm';
import { clearLlmEnv, closeServers, setPrimaryEnv, startServer } from './helpers';
import { VALID_SCORE } from './mock-server';

function setFallback(url: string): void {
  process.env.LLM_FALLBACK_BASE_URL = url;
  process.env.LLM_FALLBACK_API_KEY = 'test-key';
  process.env.LLM_FALLBACK_MODEL = 'mock-fallback';
}

afterEach(async () => {
  delete process.env.STORAGE_DIR;
  clearLlmEnv();
  await closeServers();
});

describe('completeJson', () => {
  it('returns parsed JSON on the success path', async () => {
    const primary = await startServer(() => ({ content: JSON.stringify(VALID_SCORE) }));
    setPrimaryEnv(primary.url);
    await expect(completeJson('score', 'sys', 'usr')).resolves.toEqual(VALID_SCORE);
  });

  it('strips markdown code fences', async () => {
    const primary = await startServer(() => ({
      content: '```json\n' + JSON.stringify(VALID_SCORE) + '\n```',
    }));
    setPrimaryEnv(primary.url);
    await expect(completeJson('score', 'sys', 'usr')).resolves.toEqual(VALID_SCORE);
  });

  it('falls back once when the primary returns 500', async () => {
    const primary = await startServer(() => ({ status: 500 }));
    const fallback = await startServer(() => ({ content: JSON.stringify(VALID_SCORE) }));
    setPrimaryEnv(primary.url);
    setFallback(fallback.url);
    await expect(completeJson('score', 'sys', 'usr')).resolves.toEqual(VALID_SCORE);
  });

  it('falls back once on timeout without waiting for the 90s default', async () => {
    const primary = await startServer(() => ({ content: JSON.stringify(VALID_SCORE), delayMs: 1000 }));
    const fallback = await startServer(() => ({ content: JSON.stringify(VALID_SCORE) }));
    setPrimaryEnv(primary.url);
    setFallback(fallback.url);
    process.env.LLM_TIMEOUT_MS = '150';
    const started = Date.now();
    await expect(completeJson('score', 'sys', 'usr')).resolves.toEqual(VALID_SCORE);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('surfaces the error when no fallback is configured', async () => {
    const primary = await startServer(() => ({ status: 503 }));
    setPrimaryEnv(primary.url);
    await expect(completeJson('score', 'sys', 'usr')).rejects.toThrow();
  });

  it('defaults to the free Zen model when only OPENCODE_API_KEY is set', async () => {
    let seenModel: unknown;
    const primary = await startServer((body) => {
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
    const primary = await startServer((body) => {
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
    const primary = await startServer((_body, callIndex, headers) => {
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
    const primary = await startServer(() => ({ status: 500 }));
    let fallbackAuth: string | undefined;
    const fallback = await startServer((_body, _call, headers) => {
      fallbackAuth = headers.authorization;
      return { content: JSON.stringify(VALID_SCORE) };
    });
    setPrimaryEnv(primary.url);
    process.env.LLM_FALLBACK_BASE_URL = fallback.url;
    process.env.LLM_FALLBACK_MODEL = 'mock-fallback';
    process.env.LLM_FALLBACK_API_KEY = 'fallback-key';
    await expect(completeJson('score', 'sys', 'usr')).resolves.toEqual(VALID_SCORE);
    expect(fallbackAuth).toBe('Bearer fallback-key');
  });

  it('surfaces a retryable failure and makes one request when no fallback is configured', async () => {
    let requests = 0;
    const primary = await startServer(() => {
      requests += 1;
      return { status: 503 };
    });
    setPrimaryEnv(primary.url);
    await expect(completeJson('score', 'sys', 'usr')).rejects.toThrow();
    expect(requests).toBe(1);
  });

  it('swallows trace-write failures (read-only or unwritable storage)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cpilot-trace-'));
    try {
      // STORAGE_DIR under a regular file makes mkdir/append fail like a read-only filesystem.
      writeFileSync(join(dir, 'not-a-dir'), '');
      process.env.STORAGE_DIR = join(dir, 'not-a-dir', 'storage');
      const primary = await startServer(() => ({ content: JSON.stringify(VALID_SCORE) }));
      setPrimaryEnv(primary.url);
      await expect(completeJson('score', 'sys', 'usr')).resolves.toEqual(VALID_SCORE);

      const failing = await startServer(() => ({ status: 503 }));
      setPrimaryEnv(failing.url);
      const err = await completeJson('score', 'sys', 'usr').catch((e: unknown) => e as Error);
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).not.toMatch(/ENOTDIR|EEXIST|ENOENT/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
