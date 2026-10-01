import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { cache } from 'react';
import { SESSION_COOKIE, verifySession } from './auth';
import { hasBank } from './seedBank';
import { getUserById, type Role } from './users';

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
}

/** No valid session, or the session's user is gone or disabled. */
export class UnauthorizedError extends Error {
  constructor() {
    super('unauthorized');
  }
}

/**
 * The signed-in user, from the session cookie. Throws UnauthorizedError when there is none.
 * Memoised per request with React `cache()`, so AppNav and the page it sits in share one lookup.
 * Outside a React render (route handlers, tests) `cache()` just calls through.
 */
export const currentUser = cache(async (): Promise<CurrentUser> => {
  const userId = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  const user = userId === null ? null : await getUserById(userId);
  if (!user || user.disabled) throw new UnauthorizedError();
  return { id: user.id, email: user.email, role: user.role };
});

/** The signed-in user's id; the seam every store call is scoped by. */
export async function currentUserId(): Promise<string> {
  return (await currentUser()).id;
}

/** For server components: signed-out users go to /login. */
export async function pageUser(): Promise<CurrentUser> {
  try {
    return await currentUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/login');
    throw err;
  }
}

/** For admin-only pages: everyone else gets a 404. */
export async function adminPageUser(): Promise<CurrentUser> {
  const user = await pageUser();
  if (user.role !== 'admin') notFound();
  return user;
}

/** For pages that need a bank: users who have not imported their resume go to onboarding. */
export async function bankPageUser(): Promise<CurrentUser> {
  const user = await pageUser();
  if (!(await hasBank(user.id))) redirect('/onboarding');
  return user;
}

type Handler<C> = (userId: string, request: Request, context: C) => Promise<Response>;

function guarded<C>(allow: (user: CurrentUser) => boolean, handler: Handler<C>) {
  return async (request: Request, context: C): Promise<Response> => {
    let user: CurrentUser;
    try {
      user = await currentUser();
    } catch (err) {
      if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      throw err;
    }
    if (!allow(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    return handler(user.id, request, context);
  };
}

/** Route handler wrapper: 401 without a session. The handler receives the user id. */
export function withUser<C = unknown>(handler: Handler<C>) {
  return guarded(() => true, handler);
}

/** Like withUser, and 403 unless the user is an admin. */
export function withAdmin<C = unknown>(handler: Handler<C>) {
  return guarded((user) => user.role === 'admin', handler);
}
