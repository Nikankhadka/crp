import { NextResponse } from 'next/server';
import { withAdmin } from '../../../../../server/currentUser';
import { revokeInvite } from '../../../../../server/invites';

export const runtime = 'nodejs';

export const DELETE = withAdmin<{ params: Promise<{ id: string }> }>(async (adminId, _request, { params }) => {
  if (!(await revokeInvite(adminId, (await params).id))) {
    return NextResponse.json({ error: 'invite not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
});
