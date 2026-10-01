import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Score } from '../core/schemas';
import { resolvePaths } from '../paths';
import { slugify } from '../render/typst';

export type JobStatus = 'queued' | 'scoring' | 'tailoring' | 'rendering' | 'done' | 'error';

export const RUNNING_STATUSES: JobStatus[] = ['queued', 'scoring', 'tailoring', 'rendering'];

const ARTIFACT_FILES = {
  pdf: 'resume.pdf',
  docx: 'resume.docx',
  resumeJson: 'resume.json',
  scoreJson: 'score.json',
  coverLetter: 'cover-letter.md',
} as const;

export type ArtifactName = keyof typeof ARTIFACT_FILES;

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

function isSafeId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(id);
}

function jobsRoot(): string {
  return resolvePaths().jobsDir;
}

export function jobDir(id: string): string {
  return join(jobsRoot(), id);
}

function metaPath(id: string): string {
  return join(jobDir(id), 'meta.json');
}

function writeMeta(meta: JobMeta): void {
  writeFileSync(metaPath(meta.id), `${JSON.stringify(meta, null, 2)}\n`);
}

/** Create a job directory with its JD and metadata; returns the fresh meta. */
export function createJob(input: {
  title: string;
  jd: string;
  pageTarget: number;
  docIds: string[];
}): JobMeta {
  mkdirSync(jobsRoot(), { recursive: true });
  const now = new Date();
  const title = input.title.trim() !== '' ? input.title.trim() : 'Untitled job';
  const stamp = now.toISOString().toLowerCase().replace(/[:.]/g, '-');
  const id = `${stamp}-${slugify(title)}-${randomUUID().slice(0, 4)}`;
  const meta: JobMeta = {
    id,
    createdAt: now.toISOString(),
    title,
    status: 'queued',
    pageTarget: input.pageTarget,
    docIds: input.docIds,
    gaps: [],
    keywords: [],
    artifacts: [],
  };
  mkdirSync(jobDir(id), { recursive: true });
  writeFileSync(join(jobDir(id), 'jd.md'), input.jd);
  writeMeta(meta);
  return meta;
}

export function updateJob(id: string, patch: Partial<JobMeta>): JobMeta | null {
  const current = getJob(id);
  if (!current) return null;
  const next: JobMeta = { ...current, ...patch, id: current.id };
  writeMeta(next);
  return next;
}

export function getJob(id: string): JobMeta | null {
  if (!isSafeId(id)) return null;
  const file = metaPath(id);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as JobMeta;
  } catch {
    return null;
  }
}

export function listJobs(): JobMeta[] {
  if (!existsSync(jobsRoot())) return [];
  const jobs: JobMeta[] = [];
  for (const entry of readdirSync(jobsRoot(), { withFileTypes: true })) {
    if (!entry.isDirectory() || !isSafeId(entry.name)) continue;
    const meta = getJob(entry.name);
    if (meta) jobs.push(meta);
  }
  return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deleteJob(id: string): boolean {
  if (!isSafeId(id) || !existsSync(jobDir(id))) return false;
  rmSync(jobDir(id), { recursive: true, force: true });
  return true;
}

/** Absolute path for a job artifact, or null when the name is unknown or the file is absent. */
export function artifactPath(id: string, name: ArtifactName): string | null {
  if (!isSafeId(id)) return null;
  const file = join(jobDir(id), ARTIFACT_FILES[name]);
  return existsSync(file) ? file : null;
}
