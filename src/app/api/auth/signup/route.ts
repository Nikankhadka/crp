import { NextResponse } from 'next/server';
import { isJsonRequest, sessionCookie, signSession } from '../../../../server/auth';
import { signUp, SignupError } from '../../../../server/users';

export const runtime = 'nodejs';

/** Public, but only an unused, unexpired invite token creates an account. */
export async function POST(request: Request): Promise<NextResponse> {
  // Checked before anything is parsed: see isJsonRequest.
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: 'content-type must be application/json' }, { status: 415 });
  }

  let body: { token?: unknown; email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });

  try {
    const user = await signUp(body);
    const response = NextResponse.json({ ok: true });
    response.headers.set('Set-Cookie', sessionCookie(await signSession(user.id)));
    return response;
  } catch (err) {
    if (err instanceof SignupError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('signup failed', err);
    return NextResponse.json({ error: 'signup failed' }, { status: 500 });
  }
}
