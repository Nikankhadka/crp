import { NextResponse } from 'next/server';
import { isJsonRequest, sessionCookie, signSession } from '../../../../server/auth';
import { MAX_PASSWORD_LENGTH, verifyAgainstDummy, verifyPassword } from '../../../../server/passwords';
import { findUserByEmail } from '../../../../server/users';

export const runtime = 'nodejs';

const REJECTED = 'invalid email or password';

export async function POST(request: Request): Promise<NextResponse> {
  // Checked before anything is parsed: see isJsonRequest.
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: 'content-type must be application/json' }, { status: 415 });
  }

  let email = '';
  let password = '';
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    if (typeof body.email === 'string') email = body.email;
    // An over-long password is treated as empty: it still takes the normal path (and scrypt time)
    // and fails, without handing scrypt an arbitrarily large string.
    if (typeof body.password === 'string' && body.password.length <= MAX_PASSWORD_LENGTH) password = body.password;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  try {
    const user = email === '' ? null : await findUserByEmail(email);
    // Unknown email, no password set, wrong password and disabled account all answer the same, and
    // cost the same scrypt time, so the response never says which accounts exist.
    const ok =
      user?.passwordHash != null ? await verifyPassword(password, user.passwordHash) : await verifyAgainstDummy(password);
    if (!user || !ok || user.disabled) return NextResponse.json({ error: REJECTED }, { status: 401 });

    const response = NextResponse.json({ ok: true });
    response.headers.set('Set-Cookie', sessionCookie(await signSession(user.id)));
    return response;
  } catch (err) {
    console.error('login failed', err);
    return NextResponse.json({ error: 'login failed' }, { status: 500 });
  }
}
