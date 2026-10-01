import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSessionCookie,
  sessionCookie,
  SESSION_COOKIE,
  signSession,
  verifySession,
} from '../src/server/auth';

const ORIGINAL_SECRET = process.env.SESSION_SECRET;
const USER = '0b2f1c9e-6f0a-4d3e-9a52-3d2a7a0c1f10';

beforeEach(() => {
  process.env.SESSION_SECRET = 'test-secret';
});

afterEach(() => {
  vi.unstubAllEnvs();
  if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = ORIGINAL_SECRET;
});

describe('session tokens', () => {
  it('verifies a freshly signed token and returns the user it was issued to', async () => {
    expect(await verifySession(await signSession(USER))).toBe(USER);
  });

  it('rejects a missing or malformed token', async () => {
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession('')).toBeNull();
    expect(await verifySession('not-a-token')).toBeNull();
    expect(await verifySession('abc.def')).toBeNull();
    expect(await verifySession('a.b.c.d')).toBeNull();
  });

  it('rejects an expired token', async () => {
    expect(await verifySession(await signSession(USER, -10))).toBeNull();
  });

  it('rejects a tampered signature, expiry or user id', async () => {
    const [user, expiry, signature] = (await signSession(USER)).split('.');
    expect(await verifySession(`${user}.${expiry}.${signature}x`)).toBeNull();
    expect(await verifySession(`${user}.${Number(expiry) + 60}.${signature}`)).toBeNull();
    expect(await verifySession(`other-user.${expiry}.${signature}`)).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signSession(USER);
    process.env.SESSION_SECRET = 'another-secret';
    expect(await verifySession(token)).toBeNull();
  });

  it('rejects any token when SESSION_SECRET is unset, and cannot sign one', async () => {
    const token = await signSession(USER);
    delete process.env.SESSION_SECRET;
    expect(await verifySession(token)).toBeNull();
    await expect(signSession(USER)).rejects.toThrow('SESSION_SECRET');
  });

  it('in production treats a secret shorter than 32 characters, or the replace-me placeholder, as missing', async () => {
    const devToken = await signSession(USER); // 'test-secret' is fine outside production
    vi.stubEnv('NODE_ENV', 'production');
    expect(await verifySession(devToken)).toBeNull();
    for (const weak of ['test-secret', 'replace-me', 'x'.repeat(31)]) {
      process.env.SESSION_SECRET = weak;
      await expect(signSession(USER)).rejects.toThrow('SESSION_SECRET');
    }

    process.env.SESSION_SECRET = 'x'.repeat(32);
    expect(await verifySession(await signSession(USER))).toBe(USER);
  });

  it('sets the expected cookie attributes', async () => {
    const cookie = sessionCookie(await signSession(USER));
    expect(cookie.startsWith(`${SESSION_COOKIE}=`)).toBe(true);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
  });

  it('adds Secure in production only', async () => {
    const token = await signSession(USER);
    expect(sessionCookie(token)).not.toContain('Secure');
    vi.stubEnv('NODE_ENV', 'production');
    expect(sessionCookie(token)).toContain('Secure');
  });

  it('clears the cookie with Max-Age=0', () => {
    expect(clearSessionCookie()).toContain('Max-Age=0');
  });
});
