import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as login } from '../src/app/api/auth/login/route';
import { POST as signup } from '../src/app/api/auth/signup/route';
import { DELETE as revokeRoute } from '../src/app/api/admin/invites/[id]/route';
import { GET as listRoute, POST as createRoute } from '../src/app/api/admin/invites/route';
import { config, isPublicPath, proxy } from '../src/proxy';
import { SESSION_COOKIE, signSession, verifySession } from '../src/server/auth';
import { resetDb } from '../src/server/db';
import { createInvite } from '../src/server/invites';
import { hashPassword } from '../src/server/passwords';
import { ensureOwnerUser, findUserByEmail } from '../src/server/users';
import { freshDb, type TestDb } from './db-helper';
import { jsonRequest, signInAs, signOut } from './session-helper';

vi.mock('next/headers', async () => ({ cookies: (await import('./session-helper')).cookies }));

let t: TestDb;
let owner: string;

beforeEach(async () => {
  t = await freshDb();
  process.env.SESSION_SECRET = 'test-secret';
  process.env.OWNER_EMAIL = 'owner@test.local';
  process.env.APP_PASSWORD = 'owner-password-1';
  owner = await ensureOwnerUser(t.db);
});

afterEach(async () => {
  signOut();
  delete process.env.OWNER_EMAIL;
  delete process.env.APP_PASSWORD;
  await resetDb();
});

const sessionFrom = (response: Response): string | undefined =>
  /cp_session=([^;]*)/.exec(response.headers.get('set-cookie') ?? '')?.[1];

async function answer(response: Response): Promise<{ status: number; body: unknown }> {
  return { status: response.status, body: await response.json() };
}

describe('POST /api/auth/login', () => {
  it('signs the owner in with OWNER_EMAIL and APP_PASSWORD', async () => {
    const response = await login(jsonRequest('POST', { email: 'Owner@Test.Local', password: 'owner-password-1' }));
    expect(response.status).toBe(200);
    expect(await verifySession(sessionFrom(response))).toBe(owner);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  });

  it('gives the same status and body for an unknown email, a wrong password, a user without a password and a disabled user', async () => {
    await t.db.query(`update users set password_hash = $2, disabled = true where id = $1`, [
      t.userB,
      (await findUserByEmail('owner@test.local'))?.passwordHash,
    ]);
    const attempts = [
      { email: 'nobody@test.local', password: 'owner-password-1' },
      { email: 'owner@test.local', password: 'wrong-password-1' },
      { email: 'a@test.local', password: 'owner-password-1' },
      { email: 'b@test.local', password: 'owner-password-1' },
      { email: '', password: 'owner-password-1' },
    ];
    const answers = [];
    for (const attempt of attempts) {
      const response = await login(jsonRequest('POST', attempt));
      expect(response.headers.get('set-cookie')).toBeNull();
      answers.push(await answer(response));
    }
    for (const entry of answers) expect(entry).toEqual({ status: 401, body: { error: 'invalid email or password' } });
  });

  it('rejects a body that is not JSON', async () => {
    const response = await login(
      new Request('http://localhost/api/auth/login', { method: 'POST', body: 'nope', headers: { 'content-type': 'application/json' } }),
    );
    expect(response.status).toBe(400);
  });

  it('answers 415 to anything but application/json, even a valid login, so a cross-site form cannot sign a victim in', async () => {
    const credentials = { email: 'owner@test.local', password: 'owner-password-1' };
    const attempts: RequestInit[] = [
      { body: JSON.stringify(credentials) }, // fetch labels a string body text/plain, as a cross-site form can
      { body: JSON.stringify(credentials), headers: { 'content-type': 'text/plain' } },
      { body: new URLSearchParams(credentials) },
      { body: JSON.stringify(credentials), headers: { 'content-type': 'multipart/form-data; boundary=x' } },
    ];
    for (const init of attempts) {
      const response = await login(new Request('http://localhost/api/auth/login', { method: 'POST', ...init }));
      expect(response.status).toBe(415);
      expect(response.headers.get('set-cookie')).toBeNull();
    }

    const ok = await login(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'Application/JSON; charset=utf-8' },
        body: JSON.stringify(credentials),
      }),
    );
    expect(ok.status).toBe(200);
  });

  it('treats a password over 1024 characters as empty, so it is rejected, while 1024 still works', async () => {
    const setPassword = (password: string) =>
      hashPassword(password).then((hash) => t.db.query('update users set password_hash = $2 where id = $1', [owner, hash]));
    const attempt = (password: string) => login(jsonRequest('POST', { email: 'owner@test.local', password }));

    await setPassword('x'.repeat(1025));
    expect((await attempt('x'.repeat(1025))).status).toBe(401);
    await setPassword('y'.repeat(1024));
    expect((await attempt('y'.repeat(1024))).status).toBe(200);
  });

  it('logs an unexpected failure and answers a fixed message without the error text', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.SESSION_SECRET; // signing the session now throws after a correct password
    const response = await login(jsonRequest('POST', { email: 'owner@test.local', password: 'owner-password-1' }));
    process.env.SESSION_SECRET = 'test-secret';
    expect(await answer(response)).toEqual({ status: 500, body: { error: 'login failed' } });
    expect(logged).toHaveBeenCalledWith('login failed', expect.objectContaining({ message: expect.stringContaining('SESSION_SECRET') }));
    logged.mockRestore();
  });
});

describe('POST /api/auth/signup', () => {
  it('creates the user and signs them in', async () => {
    const { token } = await createInvite(owner);
    const response = await signup(jsonRequest('POST', { token, email: 'New@Test.Local', password: 'a-long-password' }));
    expect(await answer(response)).toEqual({ status: 200, body: { ok: true } });

    const user = await findUserByEmail('new@test.local');
    expect(user).toMatchObject({ role: 'user', disabled: false });
    expect(await verifySession(sessionFrom(response))).toBe(user?.id);
  });

  it('rejects a reused token and a duplicate email', async () => {
    const first = await createInvite(owner);
    const second = await createInvite(owner);
    const body = { token: first.token, email: 'new@test.local', password: 'a-long-password' };
    expect((await signup(jsonRequest('POST', body))).status).toBe(200);

    const reused = await signup(jsonRequest('POST', { ...body, email: 'other@test.local' }));
    expect(await answer(reused)).toEqual({ status: 400, body: { error: 'invalid or expired invite' } });
    expect(reused.headers.get('set-cookie')).toBeNull();

    const duplicate = await signup(jsonRequest('POST', { ...body, token: second.token, email: 'NEW@test.local' }));
    expect(duplicate.status).toBe(409);
    expect(duplicate.headers.get('set-cookie')).toBeNull();
    expect(await t.db.query(`select 1 from users where lower(email) = 'new@test.local'`)).toHaveLength(1);
  });

  it('answers 415 to anything but application/json without creating the user or using the invite', async () => {
    const { token } = await createInvite(owner);
    const body = { token, email: 'new@test.local', password: 'a-long-password' };
    const attempts: RequestInit[] = [
      { body: JSON.stringify(body) },
      { body: JSON.stringify(body), headers: { 'content-type': 'text/plain' } },
      { body: new URLSearchParams(body) },
    ];
    for (const init of attempts) {
      const response = await signup(new Request('http://localhost/api/auth/signup', { method: 'POST', ...init }));
      expect(response.status).toBe(415);
      expect(response.headers.get('set-cookie')).toBeNull();
    }
    expect(await findUserByEmail('new@test.local')).toBeNull();
    expect((await signup(jsonRequest('POST', body))).status).toBe(200);
  });

  it('logs an unexpected failure and answers a fixed message without the error text', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { token } = await createInvite(owner);
    delete process.env.SESSION_SECRET; // signing the session now throws after the account is created
    const response = await signup(jsonRequest('POST', { token, email: 'new@test.local', password: 'a-long-password' }));
    process.env.SESSION_SECRET = 'test-secret';
    expect(await answer(response)).toEqual({ status: 500, body: { error: 'signup failed' } });
    expect(logged).toHaveBeenCalledWith('signup failed', expect.objectContaining({ message: expect.stringContaining('SESSION_SECRET') }));
    logged.mockRestore();
  });

  it('rejects a missing token, a short password and junk bodies', async () => {
    expect((await signup(jsonRequest('POST', { email: 'new@test.local', password: 'a-long-password' }))).status).toBe(400);
    const { token } = await createInvite(owner);
    expect((await signup(jsonRequest('POST', { token, email: 'new@test.local', password: 'short' }))).status).toBe(400);
    expect((await signup(jsonRequest('POST', null))).status).toBe(400);
    const notJson = { method: 'POST', body: 'x', headers: { 'content-type': 'application/json' } };
    expect((await signup(new Request('http://localhost/api/auth/signup', notJson))).status).toBe(400);
  });
});

describe('admin invite routes', () => {
  const context = (id: string) => ({ params: Promise.resolve({ id }) });

  it('lets the admin create (token shown once), list and revoke', async () => {
    await signInAs(owner);
    const created = await createRoute(jsonRequest('POST', { email: 'friend@test.local', ttlDays: 3 }), undefined);
    expect(created.status).toBe(201);
    const { invite } = (await created.json()) as { invite: { id: string; token: string; email: string } };
    expect(invite).toMatchObject({ email: 'friend@test.local' });
    expect(invite.token.length).toBeGreaterThan(30);

    const listed = await (await listRoute(new Request('http://localhost/api/admin/invites'), undefined)).text();
    expect(listed).toContain(invite.id);
    expect(listed).not.toContain(invite.token);

    expect((await revokeRoute(new Request('http://localhost/x', { method: 'DELETE' }), context(invite.id))).status).toBe(200);
    expect((await revokeRoute(new Request('http://localhost/x', { method: 'DELETE' }), context(invite.id))).status).toBe(404);
  });

  it('validates the email and expiry', async () => {
    await signInAs(owner);
    for (const body of [{ email: 'nope' }, { ttlDays: 0 }, { ttlDays: 91 }, { ttlDays: 1.5 }, { ttlDays: '7' }]) {
      expect((await createRoute(jsonRequest('POST', body), undefined)).status).toBe(400);
    }
    expect((await createRoute(jsonRequest('POST', {}), undefined)).status).toBe(201);
  });

  it('forbids a non-admin on every route, and answers 401 without a session', async () => {
    const { id } = await createInvite(owner);
    const delete_ = new Request('http://localhost/x', { method: 'DELETE' });

    await signInAs(t.userA);
    expect((await listRoute(new Request('http://localhost/x'), undefined)).status).toBe(403);
    expect((await createRoute(jsonRequest('POST', {}), undefined)).status).toBe(403);
    expect((await revokeRoute(delete_, context(id))).status).toBe(403);
    expect(await t.db.query('select 1 from invites')).toHaveLength(1);

    signOut();
    expect((await listRoute(new Request('http://localhost/x'), undefined)).status).toBe(401);
    expect((await createRoute(jsonRequest('POST', {}), undefined)).status).toBe(401);
  });
});

describe('proxy', () => {
  const request = (path: string, cookie?: string) =>
    new NextRequest(`http://localhost${path}`, cookie ? { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } } : undefined);

  it('allows exactly the public paths', () => {
    for (const path of ['/login', '/signup', '/api/auth/login', '/api/auth/signup']) expect(isPublicPath(path)).toBe(true);
    for (const path of ['/', '/jobs', '/onboarding', '/bank', '/admin/invites', '/api/auth/logout', '/api/bank', '/api/admin/invites', '/signup/x', '/login-evil', '/api/auth/login/x']) {
      expect(isPublicPath(path)).toBe(false);
    }
  });

  it('runs on pages and API routes but not on static assets', () => {
    const [pattern] = config.matcher;
    const runs = (path: string) => new RegExp(`^${pattern}$`).test(path);
    for (const path of ['/', '/login', '/jobs', '/api/jobs', '/api/auth/login']) expect(runs(path)).toBe(true);
    for (const path of ['/_next/static/chunks/app.js', '/_next/image', '/favicon.ico']) expect(runs(path)).toBe(false);
  });

  it('lets public paths through without a cookie', async () => {
    for (const path of ['/login', '/signup?token=abc', '/api/auth/login', '/api/auth/signup']) {
      expect((await proxy(request(path))).headers.get('x-middleware-next')).toBe('1');
    }
  });

  it('redirects pages to /login and answers 401 to API calls without a valid cookie', async () => {
    const page = await proxy(request('/jobs'));
    expect(page.status).toBe(307);
    expect(new URL(page.headers.get('location') ?? '').pathname).toBe('/login');

    expect((await proxy(request('/admin/invites', 'garbage'))).status).toBe(307);
    expect((await proxy(request('/api/bank'))).status).toBe(401);
    expect((await proxy(request('/api/admin/invites', 'garbage'))).status).toBe(401);
  });

  it('lets a validly signed cookie through', async () => {
    const token = await signSession(owner);
    expect((await proxy(request('/jobs', token))).headers.get('x-middleware-next')).toBe('1');
    expect((await proxy(request('/api/bank', token))).headers.get('x-middleware-next')).toBe('1');
  });
});
