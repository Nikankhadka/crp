import { NextResponse } from 'next/server';
import { withUser } from '../../../../server/currentUser';
import { deleteJob, getJob } from '../../../../server/jobStore';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export const GET = withUser<Context>(async (userId, _request, { params }) => {
  const job = await getJob(userId, (await params).id);
  if (!job) return NextResponse.json({ error: 'job not found' }, { status: 404 });
  return NextResponse.json({ job });
});

export const DELETE = withUser<Context>(async (userId, _request, { params }) => {
  if (!(await deleteJob(userId, (await params).id))) {
    return NextResponse.json({ error: 'job not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
});
