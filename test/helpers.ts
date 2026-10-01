import { execFileSync } from 'node:child_process';
import { createMockServer, type MockHandler, type MockServer } from './mock-server.js';

const liveServers: MockServer[] = [];

/** Start a mock LLM server and register it for `closeServers` cleanup. */
export async function startServer(handler: MockHandler): Promise<MockServer> {
  const server = await createMockServer(handler);
  liveServers.push(server);
  return server;
}

/** Close every server started with `startServer` since the last call. */
export async function closeServers(): Promise<void> {
  await Promise.all(liveServers.splice(0).map((server) => server.close()));
}

// Every env var the LLM provider reads, so no test leaks config into the next.
export const LLM_ENV_KEYS = [
  'LLM_BASE_URL',
  'LLM_API_KEY',
  'OPENCODE_API_KEY',
  'LLM_MODEL',
  'LLM_FALLBACK_BASE_URL',
  'LLM_FALLBACK_API_KEY',
  'LLM_FALLBACK_MODEL',
  'LLM_TIMEOUT_MS',
];

export function clearLlmEnv(): void {
  for (const key of LLM_ENV_KEYS) delete process.env[key];
}

export function setPrimaryEnv(url: string): void {
  process.env.LLM_BASE_URL = url;
  process.env.LLM_API_KEY = 'test-key';
  process.env.LLM_MODEL = 'mock-model';
}

/** True when an external command runs, for skipping integration tests. */
export function hasCommand(command: string, args: string[]): boolean {
  try {
    execFileSync(command, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
