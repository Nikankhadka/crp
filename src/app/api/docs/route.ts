import { NextResponse } from 'next/server';
import {
  createDoc,
  DocTooLargeError,
  isDocCategory,
  listDocs,
} from '../../../server/docsStore';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ docs: listDocs() });
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: { category?: unknown; title?: unknown; content?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const { category, title, content } = body;
  if (typeof category !== 'string' || !isDocCategory(category)) {
    return NextResponse.json({ error: 'unknown category' }, { status: 400 });
  }
  if (typeof title !== 'string' || title.trim() === '') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (typeof content !== 'string') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  try {
    return NextResponse.json({ doc: createDoc(category, title, content) }, { status: 201 });
  } catch (err) {
    if (err instanceof DocTooLargeError) {
      return NextResponse.json({ error: err.message }, { status: 413 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'could not create doc' },
      { status: 409 },
    );
  }
}
