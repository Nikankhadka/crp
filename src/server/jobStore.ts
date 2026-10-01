import { randomUUID } from 'node:crypto';
import type { Score } from '../core/schemas';
import { slugify } from '../render/typst';
import { getDb } from './db';

export type JobStatus = 'queued' | 'scoring' | 'tailoring' | 'rendering' | 'done' | 'error';

export const RUNNING_STATUSES: JobStatus[] = ['queued', 'scoring', 'tailoring', 'rendering'];

export const ARTIFACTS = {
  pdf: { filename: 'resume.pdf', contentType: 'application/pdf' },
  docx: {
    filename: 'resume.docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  resumeJson: { filename: 'resume.json', contentType: 'application/json' },
  scoreJson: { filename: 'score.json', contentType: 'application/json' },
  coverLetter: { filename: 'cover-letter.md', contentType: 'text/markdown; charset=utf-8' },
} as const;

export type ArtifactName = keyof typeof ARTIFACTS;

const ARTIFACT_NAMES = Object.keys(ARTIFACTS) as ArtifactName[];

export interface JobMeta {
  id: string;
  createdAt: string;
  title: string;
  status: JobStatus;
  pageTarget: number;
  docIds: string[];
  score?: Score;
  gaps: string[];
  keywords: string[];
  pages?: number;
  passes?: number;
  error?: string | null;
  artifacts: ArtifactName[];
}

export type JobPatch = Partial<Omit<JobMeta, 'id' | 'createdAt' | 'artifacts'>>;

interface JobRow {
  id: string;
  created_at: Date;
  title: string;
  status: JobStatus;
  page_target: number;
  doc_ids: string[];
  score: Score | null;
  gaps: string[];
  keywords: string[];
  pages: number | null;
  passes: number | null;
  error: string | null;
  artifacts: string[];
}

// Same list for SELECT and RETURNING; the artifact list is derived from the artifacts table.
const META_COLUMNS = `id, created_at, title, status, page_target, doc_ids, score, gaps, keywords,
  pages, passes, error,
  coalesce((select array_agg(name) from artifacts where job_id = jobs.id), '{}') as artifacts`;

function toMeta(row: JobRow): JobMeta {
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    title: row.title,
    status: row.status,
    pageTarget: row.page_target,
    docIds: row.doc_ids,
    score: row.score ?? undefined,
    gaps: row.gaps,
    keywords: row.keywords,
    pages: row.pages ?? undefined,
    passes: row.passes ?? undefined,
    error: row.error ?? undefined,
    artifacts: ARTIFACT_NAMES.filter((name) => row.artifacts.includes(name)),
  };
}

/** Seconds a running job may go without an update before it counts as dead (JOB_STALE_SECONDS). */
function staleSeconds(): number {
  const raw = Number(process.env.JOB_STALE_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? raw : 420;
}

/**
 * A function that dies mid-pipeline (serverless timeout, restart) never records its failure, so a
 * running job that has not been touched for JOB_STALE_SECONDS is turned into an error on read.
 */
async function failStaleJobs(userId: string): Promise<void> {
  await (await getDb()).query(
    `update jobs set status = 'error', error = 'timed out', updated_at = now()
     where user_id = $1 and status = any($2::text[]) and updated_at < now() - make_interval(secs => $3::float8)`,
    [userId, RUNNING_STATUSES, staleSeconds()],
  );
}

/** Insert a queued job with its JD; returns the fresh meta. */
export async function createJob(
  userId: string,
  input: { title: string; jd: string; pageTarget: number; docIds: string[] },
): Promise<JobMeta> {
  const title = input.title.trim() !== '' ? input.title.trim() : 'Untitled job';
  const stamp = new Date().toISOString().toLowerCase().replace(/[:.]/g, '-');
  const id = `${stamp}-${slugify(title)}-${randomUUID().slice(0, 4)}`;
  const [row] = await (await getDb()).query<JobRow>(
    `insert into jobs (id, user_id, title, status, page_target, doc_ids, jd)
     values ($1, $2, $3, 'queued', $4, $5::jsonb, $6)
     returning ${META_COLUMNS}`,
    [id, userId, title, input.pageTarget, JSON.stringify(input.docIds), input.jd],
  );
  return toMeta(row);
}

const PATCH_COLUMNS: [key: keyof JobPatch, column: string, json: boolean][] = [
  ['title', 'title', false],
  ['status', 'status', false],
  ['pageTarget', 'page_target', false],
  ['docIds', 'doc_ids', true],
  ['score', 'score', true],
  ['gaps', 'gaps', true],
  ['keywords', 'keywords', true],
  ['pages', 'pages', false],
  ['passes', 'passes', false],
  ['error', 'error', false],
];

/** Patch a job and bump updated_at. Returns null when the job is not this user's. */
export async function updateJob(userId: string, id: string, patch: JobPatch): Promise<JobMeta | null> {
  const sets = ['updated_at = now()'];
  const params: unknown[] = [userId, id];
  for (const [key, column, json] of PATCH_COLUMNS) {
    const value = patch[key];
    if (value === undefined) continue;
    params.push(json ? JSON.stringify(value) : value);
    sets.push(`${column} = $${params.length}${json ? '::jsonb' : ''}`);
  }
  const [row] = await (await getDb()).query<JobRow>(
    `update jobs set ${sets.join(', ')} where user_id = $1 and id = $2 returning ${META_COLUMNS}`,
    params,
  );
  return row ? toMeta(row) : null;
}

export async function getJob(userId: string, id: string): Promise<JobMeta | null> {
  await failStaleJobs(userId);
  const [row] = await (await getDb()).query<JobRow>(
    `select ${META_COLUMNS} from jobs where user_id = $1 and id = $2`,
    [userId, id],
  );
  return row ? toMeta(row) : null;
}

export async function listJobs(userId: string): Promise<JobMeta[]> {
  await failStaleJobs(userId);
  const rows = await (await getDb()).query<JobRow>(
    `select ${META_COLUMNS} from jobs where user_id = $1 order by created_at desc, id desc`,
    [userId],
  );
  return rows.map(toMeta);
}

/** Delete a job and, by cascade, its artifacts. */
export async function deleteJob(userId: string, id: string): Promise<boolean> {
  const rows = await (await getDb()).query(`delete from jobs where user_id = $1 and id = $2 returning id`, [userId, id]);
  return rows.length > 0;
}

/**
 * Store or replace one job artifact. Writes nothing when the job is not this user's, so a wrong
 * job id can never touch another user's artifacts.
 */
export async function putArtifact(
  userId: string,
  jobId: string,
  name: ArtifactName,
  artifact: { contentType: string; filename: string; data: Buffer },
): Promise<void> {
  await (await getDb()).query(
    `insert into artifacts (job_id, name, content_type, filename, data)
     select id, $3, $4, $5, $6 from jobs where id = $2 and user_id = $1
     on conflict (job_id, name) do update
       set content_type = excluded.content_type, filename = excluded.filename, data = excluded.data`,
    [userId, jobId, name, artifact.contentType, artifact.filename, artifact.data],
  );
}

/** A job artifact, or null when the job is not this user's or the artifact is absent. */
export async function getArtifact(
  userId: string,
  jobId: string,
  name: ArtifactName,
): Promise<{ contentType: string; filename: string; data: Buffer } | null> {
  const [row] = await (await getDb()).query<{ content_type: string; filename: string; data: Buffer }>(
    `select a.content_type, a.filename, a.data from artifacts a
     join jobs j on j.id = a.job_id
     where j.user_id = $1 and a.job_id = $2 and a.name = $3`,
    [userId, jobId, name],
  );
  return row ? { contentType: row.content_type, filename: row.filename, data: row.data } : null;
}
