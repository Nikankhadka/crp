import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  checkPassword,
  clearSessionCookie,
  sessionCookie,
  SESSION_COOKIE,
  signSession,
  verifySession,
} from '../src/server/auth';

const ORIGINAL = {
  SESSION_SECRET: process.env.SESSION_SECRET,
  APP_PASSWORD: process.env.APP_PASSWORD,
};

beforeEach(() => {
  process.env.SESSION_SECRET = 'test-secret';
  process.env.APP_PASSWORD = 'hunter2';
});

afterEach(() => {
  if (ORIGINAL.SESSION_SECRET === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = ORIGINAL.SESSION_SECRET;
  if (ORIGINAL.APP_PASSWORD === undefined) delete process.env.APP_PASSWORD;
  else process.env.APP_PASSWORD = ORIGINAL.APP_PASSWORD;
});

describe('session tokens', () => {
  it('verifies a freshly signed token', async () => {
    expect(await verifySession(await signSession())).toBe(true);
  });

  it('rejects a missing or malformed token', async () => {
    expect(await verifySession(undefined)).toBe(false);
    expect(await verifySession('')).toBe(false);
    expect(await verifySession('not-a-token')).toBe(false);
    expect(await verifySession('abc.def')).toBe(false);
  });

  it('rejects an expired token', async () => {
    expect(await verifySession(await signSession(-10))).toBe(false);
  });

  it('rejects a tampered signature or expiry', async () => {
    const token = await signSession();
    const [expiry, signature] = token.split('.');
    expect(await verifySession(`${expiry}.${signature}x`)).toBe(false);
    expect(await verifySession(`${Number(expiry) + 60}.${signature}`)).toBe(false);
  });

  it('rejects any token when SESSION_SECRET is unset', async () => {
    const token = await signSession();
    delete process.env.SESSION_SECRET;
    expect(await verifySession(token)).toBe(false);
  });

  it('sets the expected cookie attributes', async () => {
    const cookie = sessionCookie(await signSession());
    expect(cookie.startsWith(`${SESSION_COOKIE}=`)).toBe(true);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
  });

  it('clears the cookie with Max-Age=0', () => {
    expect(clearSessionCookie()).toContain('Max-Age=0');
  });
});

describe('checkPassword', () => {
  it('accepts the configured password and rejects others', async () => {
    expect(await checkPassword('hunter2')).toBe(true);
    expect(await checkPassword('hunter3')).toBe(false);
    expect(await checkPassword('')).toBe(false);
  });

  it('throws when APP_PASSWORD is unset', async () => {
    delete process.env.APP_PASSWORD;
    await expect(checkPassword('x')).rejects.toThrow('APP_PASSWORD');
  });
});
