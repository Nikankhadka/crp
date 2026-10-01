import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Tailored } from '../src/core/schemas';
import type { MergedResume } from '../src/render/typst';
import { upsertDoc } from '../src/server/docsStore';
import { buildDocsContext, runGeneration } from '../src/server/generate';
import { createJob, getJob, jobDir } from '../src/server/jobStore';
import { VALID_SCORE } from './mock-server';

const tailored = {
  summaryId: 'summary-01',
  summaryRewrite: 'Rewritten summary.',
  sections: [],
  skillsOrder: [],
  gaps: ['Docker'],
  coverLetter: 'Dear team.',
} as unknown as Tailored;

const merged: MergedResume = {
  basics: {},
  summary: 'Rewritten summary.',
  sections: [],
  skills: [],
};

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cpilot-generate-'));
  process.env.STORAGE_DIR = dir;
  process.env.SEED_DIR = join(dir, 'seed');
  mkdirSync(join(dir, 'seed'), { recursive: true });
  writeFileSync(join(dir, 'seed', 'profile.yaml'), 'pageTarget: 1\n');
  writeFileSync(
    join(dir, 'seed', 'resume.yaml'),
    'basics:\n  name: Test Person\nsummaries: []\nsections: []\nskills: []\n',
  );
  writeFileSync(join(dir, 'seed', 'personal.md'), '# Personal\n');
});

afterEach(() => {
  delete process.env.STORAGE_DIR;
  delete process.env.SEED_DIR;
  delete process.env.PROMPT_DOCS_BUDGET_BYTES;
  rmSync(dir, { recursive: true, force: true });
});

const renderStub = async (
  _doc: MergedResume,
  outDir: string,
): Promise<{ pages: number; passes: number; pdfPath: string }> => {
  writeFileSync(join(outDir, 'resume.pdf'), 'pdf-bytes');
  writeFileSync(join(outDir, 'resume.json'), '{}');
  return { pages: 2, passes: 1, pdfPath: join(outDir, 'resume.pdf') };
};

describe('runGeneration', () => {
  it('runs score, tailor, render and docx, then records the artifacts', async () => {
    upsertDoc('memory', 'project-memory-notes', '# Project memory notes\n\nStanding facts.');
    const job = createJob({
      title: 'Role',
      jd: 'We need Docker.',
      pageTarget: 1,
      docIds: ['memory/project-memory-notes'],
    });

    let capturedDocs: string | undefined;
    await runGeneration(
      job.id,
      { jd: 'We need Docker.', docIds: job.docIds, pageTarget: 1 },
      {
        score: async (input) => {
          capturedDocs = input.docs;
          return VALID_SCORE;
        },
        tailor: async () => tailored,
        mergeResume: () => merged,
        renderToPageTarget: renderStub,
        buildDocx: async () => Buffer.from('docx-bytes'),
      },
    );

    expect(capturedDocs).toContain('Project memory notes');
    const meta = getJob(job.id);
    expect(meta?.status).toBe('done');
    expect(meta?.pages).toBe(2);
    expect(meta?.passes).toBe(1);
    expect(meta?.gaps).toEqual(['Docker']);
    expect(meta?.keywords).toEqual(VALID_SCORE.keywordsToMirror);
    expect(meta?.artifacts).toEqual(
      expect.arrayContaining(['pdf', 'docx', 'resumeJson', 'scoreJson', 'coverLetter']),
    );

    for (const file of [
      'resume.pdf',
      'resume.json',
      'resume.docx',
      'score.json',
      'cover-letter.md',
    ]) {
      expect(existsSync(join(jobDir(job.id), file))).toBe(true);
    }
  });

  it('records the error and stops when a stage throws', async () => {
    const job = createJob({ title: 'Role', jd: 'jd', pageTarget: 1, docIds: [] });
    await runGeneration(
      job.id,
      { jd: 'jd', docIds: [], pageTarget: 1 },
      {
        score: async () => {
          throw new Error('provider exploded');
        },
      },
    );
    const meta = getJob(job.id);
    expect(meta?.status).toBe('error');
    expect(meta?.error).toBe('provider exploded');
  });
});

describe('buildDocsContext', () => {
  it('returns an empty string when nothing matches', () => {
    expect(buildDocsContext(['memory/missing', 'not-a-real-id'])).toBe('');
  });

  it('stays within the byte budget and marks truncation', () => {
    upsertDoc('memory', 'long-notes', `# Long notes\n\n${'fact '.repeat(400)}`);
    process.env.PROMPT_DOCS_BUDGET_BYTES = '200';
    const context = buildDocsContext(['memory/long-notes']);
    expect(context).toContain('Long notes');
    expect(context).toContain('[truncated]');
    expect(Buffer.byteLength(context, 'utf8')).toBeLessThanOrEqual(200);
  });
});
