import { NextResponse } from 'next/server';
import { currentUserId } from '../../../../server/currentUser';
import { deleteJob, getJob } from '../../../../server/jobStore';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const job = await getJob(await currentUserId(), id);
  if (!job) return NextResponse.json({ error: 'job not found' }, { status: 404 });
  return NextResponse.json({ job });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  if (!(await deleteJob(await currentUserId(), id))) return NextResponse.json({ error: 'job not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
