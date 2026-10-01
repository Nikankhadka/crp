import { NextResponse } from 'next/server';
import { withUser } from '../../../../server/currentUser';
import { defaultCountry, DiscoveryError, searchJobs } from '../../../../server/discovery';

export const runtime = 'nodejs';

// ponytail: every call spends external Adzuna quota. Per-user rate limits land in the hardening slice.
export const GET = withUser(async (_userId, request) => {
  const params = new URL(request.url).searchParams;
  const page = params.get('page');
  try {
    return NextResponse.json(
      await searchJobs({
        what: params.get('what') ?? '',
        where: params.get('where') ?? '',
        country: params.get('country') ?? defaultCountry(),
        page: page === null ? 1 : Number(page),
      }),
    );
  } catch (err) {
    if (err instanceof DiscoveryError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
});
