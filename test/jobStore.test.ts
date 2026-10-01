import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../src/server/db';
import { MIGRATIONS, migrate } from '../src/server/migrations';
import {
  createJob,
  deleteJob,
  getArtifact,
  getJob,
  listJobs,
  putArtifact,
  updateJob,
} from '../src/server/jobStore';
import { freshDb, type TestDb } from './db-helper';

let t: TestDb;

beforeEach(async () => {
  t = await freshDb();
});

afterEach(async () => {
  delete process.env.JOB_STALE_SECONDS;
  await resetDb();
});

const input = { title: 'Role', jd: 'jd', pageTarget: 1, docIds: [] as string[] };

describe('migrate', () => {
  it('is idempotent and records each migration once', async () => {
    await migrate(t.db);
    await migrate(t.db);
    const rows = await t.db.query<{ id: string }>('select id from schema_migrations order by id');
    expect(rows.map((row) => row.id)).toEqual(MIGRATIONS.map((migration) => migration.id));
  });

  it('creates users with generated uuids', async () => {
    expect(t.userA).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
  });
});

describe('jobStore', () => {
  it('creates a job with metadata and the JD in the database', async () => {
    const job = await createJob(t.userA, {
      title: 'Senior Frontend Dev',
      jd: 'Do the thing.',
      pageTarget: 1,
      docIds: [],
    });
    expect(job.status).toBe('queued');
    expect(job.id).toMatch(/^[a-z0-9][a-z0-9-]*-[0-9a-f]{4}$/);
    expect(await getJob(t.userA, job.id)).toEqual(job);
    expect(await listJobs(t.userA)).toHaveLength(1);
    const [row] = await t.db.query<{ jd: string }>('select jd from jobs where id = $1', [job.id]);
    expect(row.jd).toBe('Do the thing.');
  });

  it('updates and reads back status and results, bumping updated_at', async () => {
    const job = await createJob(t.userA, { ...input, pageTarget: 2, docIds: ['memory/project-memory-notes'] });
    await t.db.query(`update jobs set updated_at = now() - interval '1 hour' where id = $1`, [job.id]);
    const updated = await updateJob(t.userA, job.id, {
      status: 'done',
      gaps: ['gap one'],
      keywords: ['k'],
      pages: 2,
      passes: 1,
    });
    expect(updated?.status).toBe('done');
    const read = await getJob(t.userA, job.id);
    expect(read?.gaps).toEqual(['gap one']);
    expect(read?.keywords).toEqual(['k']);
    expect(read?.pages).toBe(2);
    expect(read?.passes).toBe(1);
    expect(read?.pageTarget).toBe(2);
    expect(read?.docIds).toEqual(['memory/project-memory-notes']);
    const [row] = await t.db.query<{ fresh: boolean }>(
      `select updated_at > now() - interval '1 minute' as fresh from jobs where id = $1`,
      [job.id],
    );
    expect(row.fresh).toBe(true);
  });

  it('lists newest first and deletes', async () => {
    const older = await createJob(t.userA, { ...input, title: 'Old' });
    const newer = await createJob(t.userA, { ...input, title: 'New' });
    const ids = (await listJobs(t.userA)).map((job) => job.id);
    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
    expect(await deleteJob(t.userA, older.id)).toBe(true);
    expect(await getJob(t.userA, older.id)).toBeNull();
    expect(await deleteJob(t.userA, older.id)).toBe(false);
  });

  it('treats unknown and malformed ids as missing', async () => {
    expect(await getJob(t.userA, '../escape')).toBeNull();
    expect(await deleteJob(t.userA, '..')).toBe(false);
    expect(await updateJob(t.userA, 'nope', { status: 'done' })).toBeNull();
    expect(await getArtifact(t.userA, '../escape', 'pdf')).toBeNull();
  });

  it('derives the artifact list from the artifacts table in a stable order', async () => {
    const job = await createJob(t.userA, input);
    expect(job.artifacts).toEqual([]);
    const artifact = { contentType: 'text/markdown', filename: 'cover-letter.md', data: Buffer.from('hi') };
    await putArtifact(t.userA, job.id, 'coverLetter', artifact);
    await putArtifact(t.userA, job.id, 'pdf', { ...artifact, contentType: 'application/pdf', filename: 'resume.pdf' });
    expect((await getJob(t.userA, job.id))?.artifacts).toEqual(['pdf', 'coverLetter']);
    expect((await listJobs(t.userA))[0].artifacts).toEqual(['pdf', 'coverLetter']);
  });

  it('round-trips a PDF-sized bytea byte for byte and replaces on re-put', async () => {
    const job = await createJob(t.userA, input);
    const data = randomBytes(1_500_000);
    await putArtifact(t.userA, job.id, 'pdf', { contentType: 'application/pdf', filename: 'resume.pdf', data });
    const stored = await getArtifact(t.userA, job.id, 'pdf');
    expect(stored?.contentType).toBe('application/pdf');
    expect(stored?.filename).toBe('resume.pdf');
    expect(Buffer.isBuffer(stored?.data)).toBe(true);
    expect(stored?.data.equals(data)).toBe(true);

    const next = Buffer.from('replacement');
    await putArtifact(t.userA, job.id, 'pdf', { contentType: 'application/pdf', filename: 'resume.pdf', data: next });
    expect((await getArtifact(t.userA, job.id, 'pdf'))?.data.equals(next)).toBe(true);
    expect(await getArtifact(t.userA, job.id, 'docx')).toBeNull();
  });

  it('deleting a job deletes its artifacts', async () => {
    const job = await createJob(t.userA, input);
    await putArtifact(t.userA, job.id, 'pdf', { contentType: 'application/pdf', filename: 'resume.pdf', data: Buffer.from('x') });
    await deleteJob(t.userA, job.id);
    expect(await t.db.query('select 1 from artifacts where job_id = $1', [job.id])).toHaveLength(0);
  });
});

describe('user isolation', () => {
  it('hides another user\'s job from get, list, update, delete and artifacts', async () => {
    const job = await createJob(t.userA, input);
    await putArtifact(t.userA, job.id, 'pdf', { contentType: 'application/pdf', filename: 'resume.pdf', data: Buffer.from('secret') });

    expect(await getJob(t.userB, job.id)).toBeNull();
    expect(await listJobs(t.userB)).toEqual([]);
    expect(await updateJob(t.userB, job.id, { status: 'error', error: 'pwned' })).toBeNull();
    expect(await deleteJob(t.userB, job.id)).toBe(false);
    expect(await getArtifact(t.userB, job.id, 'pdf')).toBeNull();

    const own = await getJob(t.userA, job.id);
    expect(own?.status).toBe('queued');
    expect(own?.error).toBeUndefined();
    expect((await getArtifact(t.userA, job.id, 'pdf'))?.data.toString()).toBe('secret');
  });
});

describe('putArtifact isolation', () => {
  it('writes nothing for another user\'s job and leaves the owner\'s artifact intact', async () => {
    const job = await createJob(t.userA, input);
    await putArtifact(t.userA, job.id, 'pdf', { contentType: 'application/pdf', filename: 'resume.pdf', data: Buffer.from('mine') });

    // Overwrite attempt on an existing artifact and a new artifact name, both as user B.
    await putArtifact(t.userB, job.id, 'pdf', { contentType: 'text/plain', filename: 'evil.txt', data: Buffer.from('pwned') });
    await putArtifact(t.userB, job.id, 'docx', { contentType: 'text/plain', filename: 'evil.txt', data: Buffer.from('pwned') });
    // A job id that does not exist writes nothing either.
    await putArtifact(t.userA, 'no-such-job', 'pdf', { contentType: 'application/pdf', filename: 'resume.pdf', data: Buffer.from('x') });

    const stored = await getArtifact(t.userA, job.id, 'pdf');
    expect(stored?.data.toString()).toBe('mine');
    expect(stored?.contentType).toBe('application/pdf');
    expect(stored?.filename).toBe('resume.pdf');
    expect(await getArtifact(t.userA, job.id, 'docx')).toBeNull();
    expect(await t.db.query('select 1 from artifacts')).toHaveLength(1);
  });
});

describe('stale job sweep', () => {
  async function age(id: string, seconds: number): Promise<void> {
    await t.db.query('update jobs set updated_at = now() - make_interval(secs => $2::float8) where id = $1', [id, seconds]);
  }

  async function statusInDb(id: string): Promise<string> {
    const [row] = await t.db.query<{ status: string }>('select status from jobs where id = $1', [id]);
    return row.status;
  }

  it('listJobs sweeps a stale running job before listing', async () => {
    const stale = await createJob(t.userA, input);
    await updateJob(t.userA, stale.id, { status: 'rendering' });
    await age(stale.id, 3600);
    expect(await statusInDb(stale.id)).toBe('rendering');

    const listed = (await listJobs(t.userA)).find((job) => job.id === stale.id);
    expect(listed?.status).toBe('error');
    expect(listed?.error).toBe('timed out');
    expect(await statusInDb(stale.id)).toBe('error');
  });

  it('getJob sweeps a stale running job before reading it', async () => {
    const stale = await createJob(t.userA, input);
    await updateJob(t.userA, stale.id, { status: 'tailoring' });
    await age(stale.id, 3600);
    expect(await statusInDb(stale.id)).toBe('tailoring');

    const got = await getJob(t.userA, stale.id);
    expect(got?.status).toBe('error');
    expect(got?.error).toBe('timed out');
    expect(await statusInDb(stale.id)).toBe('error');
  });

  it('leaves fresh running jobs, done jobs and other users\' jobs alone', async () => {
    const fresh = await createJob(t.userA, input);
    const done = await createJob(t.userA, input);
    const other = await createJob(t.userB, input);
    await updateJob(t.userA, done.id, { status: 'done' });
    await age(done.id, 3600);
    await age(other.id, 3600);

    expect((await getJob(t.userA, fresh.id))?.status).toBe('queued');
    expect((await getJob(t.userA, done.id))?.status).toBe('done');
    // A's reads must not sweep B's job; B's own read does.
    const [raw] = await t.db.query<{ status: string }>('select status from jobs where id = $1', [other.id]);
    expect(raw.status).toBe('queued');
    expect((await getJob(t.userB, other.id))?.status).toBe('error');
  });

  it('honours JOB_STALE_SECONDS', async () => {
    const job = await createJob(t.userA, input);
    await age(job.id, 120);
    expect((await getJob(t.userA, job.id))?.status).toBe('queued');
    process.env.JOB_STALE_SECONDS = '60';
    expect((await getJob(t.userA, job.id))?.status).toBe('error');
  });
});
