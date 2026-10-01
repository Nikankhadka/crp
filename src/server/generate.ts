import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { score } from '../core/score';
import { tailor } from '../core/tailor';
import { resolvePaths } from '../paths';
import { buildDocx } from '../render/docx';
import { mergeResume, renderToPageTarget } from '../render/typst';
import { readDoc } from './docsStore';
import { jobDir, updateJob, type ArtifactName } from './jobStore';
import { loadSeed } from './seedBank';

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

const TRUNCATION_MARKER = '… [truncated]';

function truncateToBytes(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) return text;
  const markerBytes = Buffer.byteLength(TRUNCATION_MARKER, 'utf8');
  const clipped = Buffer.from(text, 'utf8')
    .subarray(0, Math.max(0, maxBytes - markerBytes))
    .toString('utf8')
    .replace(/\uFFFD+$/, '');
  return `${clipped.trimEnd()}${TRUNCATION_MARKER}`;
}

/**
 * Concatenate selected docs under PROMPT_DOCS_BUDGET_BYTES. Each block carries its title and
 * id so the model can see provenance; anything past the budget is truncated with a marker.
 */
export function buildDocsContext(docIds: string[]): string {
  const budget = promptDocsBudget();
  const blocks: string[] = [];
  let used = 0;

  for (const id of docIds) {
    const doc = readDoc(id);
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
 * PDF -> build DOCX, updating job status and artifacts along the way. Errors are recorded on
 * the job rather than thrown, so the queue can move on.
 */
export async function runGeneration(
  jobId: string,
  request: GenerateRequest,
  overrides: Partial<GenerateDeps> = {},
): Promise<void> {
  const deps = { ...defaultDeps, ...overrides };

  try {
    const paths = resolvePaths();
    const seed = loadSeed(paths.seedDir);
    const docs = buildDocsContext(request.docIds);
    const docsLayer = docs !== '' ? docs : undefined;

    updateJob(jobId, { status: 'scoring' });
    const scored = await deps.score({
      personal: seed.personalLayer,
      bank: seed.bankText,
      job: request.jd,
      descriptionIsFull: true,
      docs: docsLayer,
    });

    updateJob(jobId, { status: 'tailoring', score: scored, keywords: scored.keywordsToMirror });
    const tailored = await deps.tailor({
      personal: seed.personalLayer,
      bank: seed.bank,
      bankText: seed.bankText,
      job: request.jd,
      score: scored,
      descriptionIsFull: true,
      docs: docsLayer,
    });

    updateJob(jobId, { status: 'rendering', gaps: tailored.gaps });

    const dir = jobDir(jobId);
    const merged = deps.mergeResume(tailored, seed.bank);
    const target = Number.isInteger(request.pageTarget) && request.pageTarget >= 1 ? request.pageTarget : seed.pageTarget;
    const { pages, passes } = await deps.renderToPageTarget(merged, dir, target);
    writeFileSync(join(dir, 'score.json'), `${JSON.stringify(scored, null, 2)}\n`);
    if (tailored.coverLetter) {
      writeFileSync(join(dir, 'cover-letter.md'), `${tailored.coverLetter}\n`);
    }
    writeFileSync(join(dir, 'resume.docx'), await deps.buildDocx(merged));

    const artifacts: ArtifactName[] = ['pdf', 'docx', 'resumeJson', 'scoreJson'];
    if (tailored.coverLetter) artifacts.push('coverLetter');
    updateJob(jobId, { status: 'done', pages, passes, gaps: tailored.gaps, artifacts });
  } catch (err) {
    updateJob(jobId, {
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
