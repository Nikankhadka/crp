import { NextResponse } from 'next/server';
import { deleteDoc, DocTooLargeError, readDoc, saveDoc } from '../../../../server/docsStore';

export const runtime = 'nodejs';

type Context = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, { params }: Context): Promise<NextResponse> {
  const { path } = await params;
  const doc = readDoc(path.join('/'));
  if (!doc) return NextResponse.json({ error: 'doc not found' }, { status: 404 });
  return NextResponse.json({ doc });
}

export async function PUT(request: Request, { params }: Context): Promise<NextResponse> {
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
    const meta = saveDoc(path.join('/'), body.content);
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
}

export async function DELETE(_request: Request, { params }: Context): Promise<NextResponse> {
  const { path } = await params;
  if (!deleteDoc(path.join('/'))) {
    return NextResponse.json({ error: 'doc not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
