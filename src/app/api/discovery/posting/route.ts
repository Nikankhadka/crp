import { NextResponse } from 'next/server';
import { isJsonRequest } from '../../../../server/auth';
import { withUser } from '../../../../server/currentUser';
import { DiscoveryError, fetchPosting } from '../../../../server/discovery';

export const runtime = 'nodejs';

// ponytail: every call spends external Firecrawl quota. Per-user rate limits land in the hardening slice.
export const POST = withUser(async (_userId, request) => {
  // Checked before anything is parsed: see isJsonRequest.
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: 'content-type must be application/json' }, { status: 415 });
  }

  let url: unknown;
  try {
    ({ url } = (await request.json()) as { url?: unknown });
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (typeof url !== 'string') return NextResponse.json({ error: 'url is required' }, { status: 400 });

  try {
    return NextResponse.json(await fetchPosting(url));
  } catch (err) {
    if (err instanceof DiscoveryError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
});
