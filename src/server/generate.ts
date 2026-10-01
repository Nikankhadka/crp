import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { score } from '../core/score';
import { tailor } from '../core/tailor';
import { truncateToBytes } from '../core/truncate';
import { buildDocx } from '../render/docx';
import { mergeResume, renderToPageTarget } from '../render/typst';
import { readDoc } from './docsStore';
import { ARTIFACTS, putArtifact, updateJob, type ArtifactName } from './jobStore';
import { getSeed } from './seedBank';

export interface GenerateRequest {
  jd: string;
  docIds: string[];
  pageTarget: number;
}

export interface GenerateDeps {
  score: typeof score;
  tailor: typeof tailor;
  mergeResume: typeof mergeResume;
  renderToPageTarget: typeof renderToPageTarget;
  buildDocx: typeof buildDocx;
}

const defaultDeps: GenerateDeps = { score, tailor, mergeResume, renderToPageTarget, buildDocx };

const DEFAULT_DOCS_BUDGET_BYTES = 32 * 1024;

export function promptDocsBudget(): number {
  const raw = Number(process.env.PROMPT_DOCS_BUDGET_BYTES);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DOCS_BUDGET_BYTES;
}

/**
 * Concatenate selected docs under PROMPT_DOCS_BUDGET_BYTES. Each block carries its title and
 * id so the model can see provenance; anything past the budget is truncated with a marker.
 */
export async function buildDocsContext(userId: string, docIds: string[]): Promise<string> {
  const budget = promptDocsBudget();
  const blocks: string[] = [];
  let used = 0;

  for (const id of docIds) {
    const doc = await readDoc(userId, id);
    if (!doc) continue;
    const header = `## ${doc.meta.title} (${doc.meta.id})\n`;
    const headerBytes = Buffer.byteLength(header, 'utf8');
    if (used + headerBytes >= budget) break;
    const room = budget - used - headerBytes;
    const block = header + truncateToBytes(doc.content, room);
    blocks.push(block);
    used += Buffer.byteLength(block, 'utf8');
  }

  return blocks.join('\n\n');
}

/**
 * Run the full pipeline for a job: seed -> docs context -> score -> tailor -> merge -> render
 * PDF -> build DOCX, updating job status along the way and storing every artifact in the
 * database. Rendering happens in a throwaway temp dir (the deploy filesystem is read-only).
 * Errors are recorded on the job rather than thrown.
 */
export async function runGeneration(
  userId: string,
  jobId: string,
  request: GenerateRequest,
  overrides: Partial<GenerateDeps> = {},
): Promise<void> {
  const deps = { ...defaultDeps, ...overrides };
  let dir: string | undefined;

  try {
    const seed = await getSeed(userId);
    const docs = await buildDocsContext(userId, request.docIds);
    const docsLayer = docs !== '' ? docs : undefined;

    await updateJob(userId, jobId, { status: 'scoring' });
    const scored = await deps.score({
      personal: seed.personalLayer,
      bank: seed.bankText,
      job: request.jd,
      descriptionIsFull: true,
      docs: docsLayer,
    });

    await updateJob(userId, jobId, { status: 'tailoring', score: scored, keywords: scored.keywordsToMirror });
    const tailored = await deps.tailor({
      personal: seed.personalLayer,
      bank: seed.bank,
      bankText: seed.bankText,
      job: request.jd,
      score: scored,
      descriptionIsFull: true,
      docs: docsLayer,
    });

    await updateJob(userId, jobId, { status: 'rendering', gaps: tailored.gaps });

    dir = await mkdtemp(join(tmpdir(), 'cpilot-job-'));
    const merged = deps.mergeResume(tailored, seed.bank);
    const target = Number.isInteger(request.pageTarget) && request.pageTarget >= 1 ? request.pageTarget : seed.pageTarget;
    const { pages, passes } = await deps.renderToPageTarget(merged, dir, target);

    const put = (name: ArtifactName, data: Buffer | string) =>
      putArtifact(userId, jobId, name, { ...ARTIFACTS[name], data: typeof data === 'string' ? Buffer.from(data) : data });
    await put('pdf', await readFile(join(dir, 'resume.pdf')));
    await put('resumeJson', await readFile(join(dir, 'resume.json')));
    await put('docx', await deps.buildDocx(merged));
    await put('scoreJson', `${JSON.stringify(scored, null, 2)}\n`);
    if (tailored.coverLetter) await put('coverLetter', `${tailored.coverLetter}\n`);

    // error: null clears a 'timed out' left by the stale sweep if this run outlived it.
    await updateJob(userId, jobId, { status: 'done', pages, passes, gaps: tailored.gaps, error: null });
  } catch (err) {
    await updateJob(userId, jobId, {
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true });
  }
}
