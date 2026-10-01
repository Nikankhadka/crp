import { after, NextResponse } from 'next/server';
import { currentUserId } from '../../../server/currentUser';
import { runGeneration } from '../../../server/generate';
import { createJob, listJobs } from '../../../server/jobStore';

export const runtime = 'nodejs';
// Generation runs after the response, inside this function's lifetime.
// ponytail: score + tailor can far exceed 300s in the worst case (90s per-call timeout plus the
// fallback retry, twice over, plus rendering). A job that overruns is marked 'timed out' by the
// stale sweep. Upgrade path: a durable queue or Workflow, or a plan with a longer maxDuration.
export const maxDuration = 300;

const MAX_JD_BYTES = 20 * 1024;

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ jobs: await listJobs(await currentUserId()) });
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: { jd?: unknown; title?: unknown; pageTarget?: unknown; docIds?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const jd = typeof body.jd === 'string' ? body.jd.trim() : '';
  if (jd === '') return NextResponse.json({ error: 'jd is required' }, { status: 400 });
  if (Buffer.byteLength(jd, 'utf8') > MAX_JD_BYTES) {
    return NextResponse.json({ error: 'job description is too large' }, { status: 413 });
  }

  const title = typeof body.title === 'string' ? body.title : '';
  const pageTarget =
    typeof body.pageTarget === 'number' && Number.isInteger(body.pageTarget) && body.pageTarget >= 1
      ? body.pageTarget
      : 1;
  const docIds = Array.isArray(body.docIds)
    ? body.docIds.filter((id): id is string => typeof id === 'string')
    : [];

  const userId = await currentUserId();
  const job = await createJob(userId, { title, jd, pageTarget, docIds });
  after(() => runGeneration(userId, job.id, { jd, docIds, pageTarget }));
  return NextResponse.json({ id: job.id, status: job.status }, { status: 202 });
}
