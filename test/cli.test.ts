import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { createMockServer, VALID_SCORE, type MockServer } from './mock-server.js';

const hasSeed = existsSync('seed/me/resume.yaml');
const maybe = hasSeed ? describe : describe.skip;

interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function run(baseUrl: string): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', 'src/cli.ts', 'score', 'test/fixtures/sample-jd.txt'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        LLM_BASE_URL: baseUrl,
        LLM_API_KEY: 'test-key',
        LLM_MODEL: 'mock-model',
      },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

maybe('cli score', () => {
  const servers: MockServer[] = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
  });

  it('prints a valid Score as JSON', async () => {
    const server = await createMockServer(() => ({ content: JSON.stringify(VALID_SCORE) }));
    servers.push(server);

    const result = await run(server.url);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toEqual(VALID_SCORE);
  }, 60_000);
});
