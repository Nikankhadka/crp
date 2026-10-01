import { NextResponse } from 'next/server';
import { runGeneration } from '../../../server/generate';
import { createJob, listJobs } from '../../../server/jobStore';
import { enqueue } from '../../../server/queue';

export const runtime = 'nodejs';

const MAX_JD_BYTES = 20 * 1024;

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ jobs: listJobs() });
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

  const job = createJob({ title, jd, pageTarget, docIds });
  enqueue({ jobId: job.id, run: () => runGeneration(job.id, { jd, docIds, pageTarget }) });
  return NextResponse.json({ id: job.id, status: job.status }, { status: 202 });
}
