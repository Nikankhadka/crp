import { existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Tailored } from '../src/core/schemas';
import type { MergedResume } from '../src/render/typst';
import { resetDb } from '../src/server/db';
import { upsertDoc } from '../src/server/docsStore';
import { buildDocsContext, runGeneration } from '../src/server/generate';
import { createJob, getArtifact, getJob, updateJob } from '../src/server/jobStore';
import { VALID_SCORE } from './mock-server';
import { freshDb, putBank, type TestDb } from './db-helper';

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

let t: TestDb;

beforeEach(async () => {
  t = await freshDb();
  await putBank(t.db, t.userA);
});

afterEach(async () => {
  delete process.env.PROMPT_DOCS_BUDGET_BYTES;
  await resetDb();
});

const renderedDirs: string[] = [];

const renderStub = async (
  _doc: MergedResume,
  outDir: string,
): Promise<{ pages: number; passes: number; pdfPath: string }> => {
  renderedDirs.push(outDir);
  writeFileSync(join(outDir, 'resume.pdf'), 'pdf-bytes');
  writeFileSync(join(outDir, 'resume.json'), '{"ok":true}');
  return { pages: 2, passes: 1, pdfPath: join(outDir, 'resume.pdf') };
};

describe('runGeneration', () => {
  it('runs score, tailor, render and docx, then stores the artifacts in the database', async () => {
    await upsertDoc(t.userA, 'memory', 'project-memory-notes', '# Project memory notes\n\nStanding facts.');
    const job = await createJob(t.userA, {
      title: 'Role',
      jd: 'We need Docker.',
      pageTarget: 1,
      docIds: ['memory/project-memory-notes'],
    });

    // A job the stale sweep already failed must not keep 'timed out' once the run finishes.
    await updateJob(t.userA, job.id, { status: 'error', error: 'timed out' });

    let capturedDocs: string | undefined;
    await runGeneration(
      t.userA,
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
    const meta = await getJob(t.userA, job.id);
    expect(meta?.status).toBe('done');
    expect(meta?.error).toBeUndefined();
    expect(meta?.pages).toBe(2);
    expect(meta?.passes).toBe(1);
    expect(meta?.gaps).toEqual(['Docker']);
    expect(meta?.keywords).toEqual(VALID_SCORE.keywordsToMirror);
    expect(meta?.artifacts).toEqual(['pdf', 'docx', 'resumeJson', 'scoreJson', 'coverLetter']);

    const pdf = await getArtifact(t.userA, job.id, 'pdf');
    expect(pdf?.data.toString()).toBe('pdf-bytes');
    expect(pdf?.contentType).toBe('application/pdf');
    expect((await getArtifact(t.userA, job.id, 'docx'))?.data.toString()).toBe('docx-bytes');
    expect((await getArtifact(t.userA, job.id, 'resumeJson'))?.data.toString()).toBe('{"ok":true}');
    expect(JSON.parse((await getArtifact(t.userA, job.id, 'scoreJson'))?.data.toString() ?? '')).toMatchObject({
      score: VALID_SCORE.score,
    });
    expect((await getArtifact(t.userA, job.id, 'coverLetter'))?.data.toString()).toContain('Dear team.');

    // Another user cannot read them.
    expect(await getArtifact(t.userB, job.id, 'pdf')).toBeNull();
  });

  it('renders into a temp dir that is removed afterwards', async () => {
    const job = await createJob(t.userA, { title: 'Role', jd: 'jd', pageTarget: 1, docIds: [] });
    renderedDirs.length = 0;
    await runGeneration(
      t.userA,
      job.id,
      { jd: 'jd', docIds: [], pageTarget: 1 },
      { score: async () => VALID_SCORE, tailor: async () => tailored, mergeResume: () => merged, renderToPageTarget: renderStub, buildDocx: async () => Buffer.from('d') },
    );
    expect(renderedDirs).toHaveLength(1);
    expect(renderedDirs[0].startsWith(tmpdir())).toBe(true);
    expect(existsSync(renderedDirs[0])).toBe(false);
  });

  it('records the error, stores no artifacts and removes the temp dir when a stage throws', async () => {
    const job = await createJob(t.userA, { title: 'Role', jd: 'jd', pageTarget: 1, docIds: [] });
    renderedDirs.length = 0;
    await runGeneration(
      t.userA,
      job.id,
      { jd: 'jd', docIds: [], pageTarget: 1 },
      {
        score: async () => VALID_SCORE,
        tailor: async () => tailored,
        mergeResume: () => merged,
        renderToPageTarget: async (_doc, outDir) => {
          renderedDirs.push(outDir);
          throw new Error('typst exploded');
        },
      },
    );
    const meta = await getJob(t.userA, job.id);
    expect(meta?.status).toBe('error');
    expect(meta?.error).toBe('typst exploded');
    expect(meta?.artifacts).toEqual([]);
    expect(existsSync(renderedDirs[0])).toBe(false);
  });

  it('records the error and stops when the score stage throws', async () => {
    const job = await createJob(t.userA, { title: 'Role', jd: 'jd', pageTarget: 1, docIds: [] });
    await runGeneration(
      t.userA,
      job.id,
      { jd: 'jd', docIds: [], pageTarget: 1 },
      {
        score: async () => {
          throw new Error('provider exploded');
        },
      },
    );
    const meta = await getJob(t.userA, job.id);
    expect(meta?.status).toBe('error');
    expect(meta?.error).toBe('provider exploded');
  });

  it('fails the job clearly when the user has no seed bank', async () => {
    const job = await createJob(t.userB, { title: 'Role', jd: 'jd', pageTarget: 1, docIds: [] });
    await runGeneration(t.userB, job.id, { jd: 'jd', docIds: [], pageTarget: 1 });
    const meta = await getJob(t.userB, job.id);
    expect(meta?.status).toBe('error');
    expect(meta?.error).toBe('no seed bank for this user');
  });
});

describe('buildDocsContext', () => {
  it('returns an empty string when nothing matches', async () => {
    expect(await buildDocsContext(t.userA, ['memory/missing', 'not-a-real-id'])).toBe('');
  });

  it('stays within the byte budget and marks truncation', async () => {
    await upsertDoc(t.userA, 'memory', 'long-notes', `# Long notes\n\n${'fact '.repeat(400)}`);
    process.env.PROMPT_DOCS_BUDGET_BYTES = '200';
    const context = await buildDocsContext(t.userA, ['memory/long-notes']);
    expect(context).toContain('Long notes');
    expect(context).toContain('[truncated]');
    expect(Buffer.byteLength(context, 'utf8')).toBeLessThanOrEqual(200);
  });

  it('never reads another user\'s docs', async () => {
    await upsertDoc(t.userB, 'memory', 'secret', '# Secret notes');
    expect(await buildDocsContext(t.userA, ['memory/secret'])).toBe('');
  });
});
