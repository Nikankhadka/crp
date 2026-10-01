import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { closeServers, hasCommand, startServer } from './helpers';
import { VALID_SCORE } from './mock-server';

const hasSeed = existsSync('seed/me/resume.yaml');
const maybe = hasSeed ? describe : describe.skip;

const maybeRender = hasSeed && hasCommand('typst', ['--version']) ? describe : describe.skip;

interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function run(baseUrl: string, args: string[] = ['score']): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', 'src/cli.ts', ...args, 'test/fixtures/sample-jd.txt'], {
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
  afterEach(closeServers);

  it('prints a valid Score as JSON', async () => {
    const server = await startServer(() => ({ content: JSON.stringify(VALID_SCORE) }));

    const result = await run(server.url);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toEqual(VALID_SCORE);
  }, 60_000);

  it('tailor prints { score, tailored } as JSON', async () => {
    // Distinguish tasks by the system prompt: the tailor task carries tailor.md's heading.
    const server = await startServer((body) => {
      const messages = (body as { messages?: { role: string; content: string }[] }).messages ?? [];
      const system = messages.find((m) => m.role === 'system')?.content ?? '';
      const isTailor = system.includes('tailor the bank to a job advertisement');
      const content = isTailor ? VALID_TAILORED : VALID_SCORE;
      return { content: JSON.stringify(content) };
    });

    const result = await run(server.url, ['tailor']);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    const parsed = JSON.parse(result.stdout);
    expect(parsed.score).toEqual(VALID_SCORE);
    expect(parsed.tailored).toEqual(VALID_TAILORED);
  }, 60_000);
});

maybeRender('cli render', () => {
  const outDir = join('out', 'local', 'sample-jd', 'v1');

  afterEach(async () => {
    rmSync(join('out', 'local', 'sample-jd'), { recursive: true, force: true });
    await closeServers();
  });

  it('scores, tailors and renders out/local/sample-jd/v1', async () => {
    const server = await startServer((body) => {
      const messages = (body as { messages?: { role: string; content: string }[] }).messages ?? [];
      const system = messages.find((m) => m.role === 'system')?.content ?? '';
      const content = system.includes('tailor the bank to a job advertisement')
        ? VALID_TAILORED
        : VALID_SCORE;
      return { content: JSON.stringify(content) };
    });

    const result = await run(server.url, ['test/fixtures/sample-jd.txt']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('score: 80');
    expect(result.stdout).toContain('pages: 1');
    expect(existsSync(join(outDir, 'score.json'))).toBe(true);
    expect(existsSync(join(outDir, 'resume.json'))).toBe(true);
    expect(existsSync(join(outDir, 'resume.pdf'))).toBe(true);
    expect(existsSync(join(outDir, 'cover-letter.md'))).toBe(false);
  }, 60_000);
});

// Minimal tailored payload valid against test/fixtures/sample-jd.txt's real bank shape.
const VALID_TAILORED = {
  summaryId: 'summary-care-01',
  summaryRewrite: 'Compassionate support worker with recent Australian placement experience.',
  sections: [
    {
      type: 'experience',
      items: [
        {
          itemId: 'exp-delifresco',
          bullets: [
            {
              sourceId: 'exp-delifresco-01',
              text: 'Enhanced customer experience through personalized recommendations, inquiries assistance, and efficient purchase support.',
            },
          ],
        },
      ],
    },
  ],
  skillsOrder: ['TypeScript', 'Playwright'],
  gaps: ['No first aid certificate on file'],
};
