import { NextResponse } from 'next/server';
import { clearSessionCookie } from '../../../../server/auth';

export const runtime = 'nodejs';

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.headers.set('Set-Cookie', clearSessionCookie());
  return response;
}
