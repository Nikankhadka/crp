import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from './server/auth';

/** Exact paths reachable without a session; everything else needs the signed cookie. */
const PUBLIC_PATHS = new Set(['/login', '/signup', '/api/auth/login', '/api/auth/signup']);

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

/**
 * Gate every page and API route behind the signed session cookie. This only checks the signature
 * and expiry; route handlers and pages still load the user (a disabled or deleted user is logged
 * out there).
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();
  if (await verifySession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const login = request.nextUrl.clone();
  login.pathname = '/login';
  login.search = '';
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
