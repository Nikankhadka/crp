import { NextResponse } from 'next/server';
import { withAdmin } from '../../../../server/currentUser';
import { createInvite, DEFAULT_INVITE_TTL_DAYS, listInvites, MAX_INVITE_TTL_DAYS } from '../../../../server/invites';
import { parseEmail } from '../../../../server/users';

export const runtime = 'nodejs';

export const GET = withAdmin(async (adminId) => NextResponse.json({ invites: await listInvites(adminId) }));

/** The raw token is in this response only; the database keeps just its hash. */
export const POST = withAdmin(async (adminId, request) => {
  let body: { email?: unknown; ttlDays?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const blankEmail = body.email === undefined || body.email === null || body.email === '';
  const email = blankEmail ? null : parseEmail(body.email);
  if (!blankEmail && email === null) return NextResponse.json({ error: 'enter a valid email address' }, { status: 400 });

  const ttlDays = body.ttlDays ?? DEFAULT_INVITE_TTL_DAYS;
  if (typeof ttlDays !== 'number' || !Number.isInteger(ttlDays) || ttlDays < 1 || ttlDays > MAX_INVITE_TTL_DAYS) {
    return NextResponse.json({ error: `expiry must be 1 to ${MAX_INVITE_TTL_DAYS} days` }, { status: 400 });
  }

  const invite = await createInvite(adminId, { email, ttlDays });
  return NextResponse.json({ invite }, { status: 201 });
});
