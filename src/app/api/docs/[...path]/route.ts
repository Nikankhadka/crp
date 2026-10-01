import { NextResponse } from 'next/server';
import { withUser } from '../../../../server/currentUser';
import { deleteDoc, DocTooLargeError, readDoc, saveDoc } from '../../../../server/docsStore';

export const runtime = 'nodejs';

type Context = { params: Promise<{ path: string[] }> };

export const GET = withUser<Context>(async (userId, _request, { params }) => {
  const { path } = await params;
  const doc = await readDoc(userId, path.join('/'));
  if (!doc) return NextResponse.json({ error: 'doc not found' }, { status: 404 });
  return NextResponse.json({ doc });
});

export const PUT = withUser<Context>(async (userId, request, { params }) => {
  const { path } = await params;
  let body: { content?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (typeof body.content !== 'string') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }
  try {
    const meta = await saveDoc(userId, path.join('/'), body.content);
    if (!meta) return NextResponse.json({ error: 'doc not found' }, { status: 404 });
    return NextResponse.json({ doc: meta });
  } catch (err) {
    if (err instanceof DocTooLargeError) {
      return NextResponse.json({ error: err.message }, { status: 413 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'could not save doc' },
      { status: 400 },
    );
  }
});

export const DELETE = withUser<Context>(async (userId, _request, { params }) => {
  const { path } = await params;
  if (!(await deleteDoc(userId, path.join('/')))) {
    return NextResponse.json({ error: 'doc not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
});
