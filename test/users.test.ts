import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDb } from '../src/server/db';
import { verifyPassword } from '../src/server/passwords';
import { currentUser, currentUserId, UnauthorizedError } from '../src/server/currentUser';
import { createInvite } from '../src/server/invites';
import { ensureOwnerUser, findUserByEmail, getUserById, parseEmail, signUp, SignupError } from '../src/server/users';
import { freshDb, type TestDb } from './db-helper';
import { setSessionToken, signInAs, signOut } from './session-helper';

vi.mock('next/headers', async () => ({ cookies: (await import('./session-helper')).cookies }));

let t: TestDb;

beforeEach(async () => {
  t = await freshDb();
  process.env.SESSION_SECRET = 'test-secret';
  process.env.OWNER_EMAIL = 'Owner@Test.Local';
  process.env.APP_PASSWORD = 'owner-password-1';
});

afterEach(async () => {
  signOut();
  delete process.env.OWNER_EMAIL;
  delete process.env.APP_PASSWORD;
  await resetDb();
});

describe('ensureOwnerUser', () => {
  it('creates the owner as an admin with the APP_PASSWORD hash, and is idempotent', async () => {
    const id = await ensureOwnerUser(t.db);
    expect(await ensureOwnerUser(t.db)).toBe(id);
    const owner = await getUserById(id);
    expect(owner).toMatchObject({ email: 'owner@test.local', role: 'admin', disabled: false });
    expect(await verifyPassword('owner-password-1', owner?.passwordHash ?? '')).toBe(true);
    expect(await t.db.query('select 1 from users where lower(email) = $1', ['owner@test.local'])).toHaveLength(1);
  });

  it('never overrides a password the owner already has when APP_PASSWORD changes', async () => {
    await ensureOwnerUser(t.db);
    process.env.APP_PASSWORD = 'a-different-password';
    const id = await ensureOwnerUser(t.db);
    const hash = (await getUserById(id))?.passwordHash ?? '';
    expect(await verifyPassword('owner-password-1', hash)).toBe(true);
    expect(await verifyPassword('a-different-password', hash)).toBe(false);
  });

  it('seeds the password onto an existing owner row that has none, and promotes it to admin', async () => {
    await t.db.query(`insert into users (email) values ('Owner@Test.Local')`);
    const id = await ensureOwnerUser(t.db);
    const owner = await getUserById(id);
    expect(owner?.role).toBe('admin');
    expect(owner?.passwordHash).not.toBeNull();
    expect(await t.db.query('select 1 from users where lower(email) = $1', ['owner@test.local'])).toHaveLength(1);
  });

  it('skips seeding with a warning when APP_PASSWORD is a placeholder or shorter than the minimum', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const weak of ['replace-me', 'short', 'ninechars']) {
      process.env.APP_PASSWORD = weak;
      expect((await getUserById(await ensureOwnerUser(t.db)))?.passwordHash).toBeNull();
    }
    expect(warn).toHaveBeenCalledTimes(3);

    process.env.APP_PASSWORD = 'owner-password-1';
    expect((await getUserById(await ensureOwnerUser(t.db)))?.passwordHash).not.toBeNull();
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });

  it('leaves the owner without a password when APP_PASSWORD is unset', async () => {
    delete process.env.APP_PASSWORD;
    expect((await getUserById(await ensureOwnerUser(t.db)))?.passwordHash).toBeNull();
  });
});

describe('currentUser', () => {
  it('returns the signed-in user', async () => {
    await signInAs(t.userA);
    expect(await currentUser()).toEqual({ id: t.userA, email: 'a@test.local', role: 'user' });
    expect(await currentUserId()).toBe(t.userA);
  });

  it('treats no cookie, a bad cookie, a disabled user and a deleted user as logged out', async () => {
    await expect(currentUser()).rejects.toBeInstanceOf(UnauthorizedError);

    setSessionToken('garbage');
    await expect(currentUser()).rejects.toBeInstanceOf(UnauthorizedError);

    await signInAs(t.userA);
    await t.db.query('update users set disabled = true where id = $1', [t.userA]);
    await expect(currentUser()).rejects.toBeInstanceOf(UnauthorizedError);

    await signInAs(t.userB);
    await t.db.query('delete from users where id = $1', [t.userB]);
    await expect(currentUser()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('logs out a session whose user id is not a uuid without touching the database', async () => {
    setSessionToken(await (await import('../src/server/auth')).signSession('not-a-uuid'));
    await expect(currentUser()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe('parseEmail and findUserByEmail', () => {
  it('lowercases and trims, and rejects non-addresses', () => {
    expect(parseEmail('  Me@Example.COM ')).toBe('me@example.com');
    for (const bad of ['', 'nope', 'a@b', 'a b@c.d', 42, null, undefined]) expect(parseEmail(bad)).toBeNull();
  });

  it('finds a user regardless of case', async () => {
    expect((await findUserByEmail('A@TEST.LOCAL'))?.id).toBe(t.userA);
    expect(await findUserByEmail('nobody@test.local')).toBeNull();
  });
});

describe('signUp', () => {
  it('creates a regular user with a hashed password and marks the invite used by them', async () => {
    const admin = await ensureOwnerUser(t.db);
    const { token, id } = await createInvite(admin);
    const user = await signUp({ token, email: ' New@Test.Local ', password: 'a-long-password' });

    expect(user).toMatchObject({ email: 'new@test.local', role: 'user', disabled: false });
    expect(user.passwordHash).toMatch(/^scrypt\$/);
    expect(await verifyPassword('a-long-password', user.passwordHash ?? '')).toBe(true);
    const [invite] = await t.db.query<{ used_by: string }>('select used_by from invites where id = $1', [id]);
    expect(invite.used_by).toBe(user.id);
  });

  it('rejects a short password, a bad email and a missing token without using the invite', async () => {
    const { token } = await createInvite(await ensureOwnerUser(t.db));
    await expect(signUp({ token, email: 'new@test.local', password: 'short' })).rejects.toMatchObject({ status: 400 });
    await expect(signUp({ token, email: 'nope', password: 'a-long-password' })).rejects.toMatchObject({ status: 400 });
    await expect(signUp({ token: '', email: 'new@test.local', password: 'a-long-password' })).rejects.toBeInstanceOf(SignupError);
    expect((await signUp({ token, email: 'new@test.local', password: 'a-long-password' })).email).toBe('new@test.local');
  });

  it('gives an existing email a conflict and rolls the invite back so it can be used again', async () => {
    const { token } = await createInvite(await ensureOwnerUser(t.db));
    await expect(signUp({ token, email: 'a@test.local', password: 'a-long-password' })).rejects.toMatchObject({ status: 409 });
    expect((await signUp({ token, email: 'fresh@test.local', password: 'a-long-password' })).email).toBe('fresh@test.local');
  });

  it('refuses an email that differs only by case from an existing user', async () => {
    const { token } = await createInvite(await ensureOwnerUser(t.db));
    await expect(signUp({ token, email: 'A@TEST.LOCAL', password: 'a-long-password' })).rejects.toMatchObject({ status: 409 });
  });

  it('says the same thing for any bad token, even for an email that is taken', async () => {
    await expect(signUp({ token: 'nope', email: 'a@test.local', password: 'a-long-password' })).rejects.toMatchObject({
      message: 'invalid or expired invite',
      status: 400,
    });
    await expect(signUp({ token: 'nope', email: 'free@test.local', password: 'a-long-password' })).rejects.toMatchObject({
      message: 'invalid or expired invite',
      status: 400,
    });
  });
});

