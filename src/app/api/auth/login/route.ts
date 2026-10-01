import { NextResponse } from 'next/server';
import { checkPassword, sessionCookie, signSession } from '../../../../server/auth';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<NextResponse> {
  let password = '';
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === 'string') password = body.password;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  try {
    if (password === '' || !(await checkPassword(password))) {
      return NextResponse.json({ error: 'invalid password' }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.headers.set('Set-Cookie', sessionCookie(await signSession()));
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'login failed' },
      { status: 500 },
    );
  }
}
