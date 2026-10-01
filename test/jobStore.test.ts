import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  artifactPath,
  createJob,
  deleteJob,
  getJob,
  jobDir,
  listJobs,
  updateJob,
} from '../src/server/jobStore';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cpilot-jobs-'));
  process.env.STORAGE_DIR = dir;
});

afterEach(() => {
  delete process.env.STORAGE_DIR;
  rmSync(dir, { recursive: true, force: true });
});

describe('jobStore', () => {
  it('creates a job with metadata and the JD on disk', () => {
    const job = createJob({ title: 'Senior Frontend Dev', jd: 'Do the thing.', pageTarget: 1, docIds: [] });
    expect(job.status).toBe('queued');
    expect(job.id).toMatch(/^[a-z0-9][a-z0-9-]*-[0-9a-f]{4}$/);
    expect(getJob(job.id)).toEqual(job);
    expect(listJobs()).toHaveLength(1);
  });

  it('updates and reads back status and results', () => {
    const job = createJob({ title: 'Role', jd: 'jd', pageTarget: 2, docIds: ['memory/project-memory-notes'] });
    const updated = updateJob(job.id, { status: 'done', gaps: ['gap one'], artifacts: ['pdf'] });
    expect(updated?.status).toBe('done');
    expect(getJob(job.id)?.gaps).toEqual(['gap one']);
    expect(getJob(job.id)?.pageTarget).toBe(2);
  });

  it('lists newest first and deletes', () => {
    const older = createJob({ title: 'Old', jd: 'jd', pageTarget: 1, docIds: [] });
    const newer = createJob({ title: 'New', jd: 'jd', pageTarget: 1, docIds: [] });
    const ids = listJobs().map((job) => job.id);
    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
    expect(deleteJob(older.id)).toBe(true);
    expect(getJob(older.id)).toBeNull();
  });

  it('rejects unsafe ids and unknown artifacts', () => {
    expect(getJob('../escape')).toBeNull();
    expect(deleteJob('..')).toBe(false);
    expect(artifactPath('../escape', 'pdf')).toBeNull();
  });

  it('resolves artifact paths only when the file exists', () => {
    const job = createJob({ title: 'Role', jd: 'jd', pageTarget: 1, docIds: [] });
    expect(artifactPath(job.id, 'pdf')).toBeNull();
    writeFileSync(join(jobDir(job.id), 'resume.pdf'), 'pdf-bytes');
    expect(artifactPath(job.id, 'pdf')).toBe(join(jobDir(job.id), 'resume.pdf'));
  });
});
