import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../src/server/db';
import { consumeInvite, createInvite, InviteError, listInvites, revokeInvite } from '../src/server/invites';
import { ensureOwnerUser, signUp } from '../src/server/users';
import { freshDb, type TestDb } from './db-helper';

let t: TestDb;
let admin: string;

beforeEach(async () => {
  t = await freshDb();
  admin = await ensureOwnerUser(t.db);
});

afterEach(async () => {
  await resetDb();
});

const consume = (token: string, email = 'new@test.local') => t.db.transaction((tx) => consumeInvite(tx, token, email));

describe('createInvite', () => {
  it('returns the raw token once and stores only its sha256 hash', async () => {
    const invite = await createInvite(admin);
    expect(invite.token.length).toBeGreaterThanOrEqual(40);
    expect(invite).toMatchObject({ status: 'active', email: null, usedAt: null, usedBy: null });

    const rows = await t.db.query<Record<string, unknown>>('select * from invites');
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).toBe(createHash('sha256').update(invite.token).digest('hex'));
    expect(JSON.stringify(rows[0])).not.toContain(invite.token);
    expect(JSON.stringify(await listInvites(admin))).not.toContain(invite.token);
  });

  it('defaults to a 7 day expiry, honours ttlDays, and lowercases the invited email', async () => {
    const week = await createInvite(admin);
    const short = await createInvite(admin, { email: ' Friend@Test.Local ', ttlDays: 1 });
    const days = (iso: string, from: string) => (Date.parse(iso) - Date.parse(from)) / 86_400_000;
    expect(days(week.expiresAt, week.createdAt)).toBeCloseTo(7, 1);
    expect(days(short.expiresAt, short.createdAt)).toBeCloseTo(1, 1);
    expect(short.email).toBe('friend@test.local');
  });
});

describe('consumeInvite', () => {
  it('accepts a valid token once and refuses it after', async () => {
    const { token } = await createInvite(admin);
    expect(await consume(token)).toEqual(expect.any(String));
    await expect(consume(token)).rejects.toBeInstanceOf(InviteError);
  });

  it('refuses an unknown token, an expired invite and a revoked invite', async () => {
    await expect(consume('not-a-real-token')).rejects.toBeInstanceOf(InviteError);

    const expired = await createInvite(admin);
    await t.db.query(`update invites set expires_at = now() - interval '1 minute' where id = $1`, [expired.id]);
    await expect(consume(expired.token)).rejects.toBeInstanceOf(InviteError);

    const revoked = await createInvite(admin);
    expect(await revokeInvite(admin, revoked.id)).toBe(true);
    await expect(consume(revoked.token)).rejects.toBeInstanceOf(InviteError);
  });

  it('enforces the invited email, ignoring case, and leaves the invite usable after a mismatch', async () => {
    const { token } = await createInvite(admin, { email: 'friend@test.local' });
    await expect(consume(token, 'someone-else@test.local')).rejects.toBeInstanceOf(InviteError);
    expect(await consume(token, 'FRIEND@test.local')).toEqual(expect.any(String));
  });

  it('lets exactly one of two concurrent signups win', async () => {
    const { token } = await createInvite(admin);
    const results = await Promise.allSettled([
      signUp({ token, email: 'one@test.local', password: 'a-long-password' }),
      signUp({ token, email: 'two@test.local', password: 'a-long-password' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const loser = results.find((result) => result.status === 'rejected');
    expect(loser).toMatchObject({ reason: { message: 'invalid or expired invite' } });
    expect(await t.db.query(`select 1 from users where email in ('one@test.local', 'two@test.local')`)).toHaveLength(1);
  });

  it('lets exactly one of two concurrent consumers win at the store level', async () => {
    const { token } = await createInvite(admin);
    const results = await Promise.allSettled([consume(token, 'a@x.test'), consume(token, 'b@x.test')]);
    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
  });
});

describe('listInvites and revokeInvite', () => {
  it('reports active, used and expired, newest first, with who used it', async () => {
    const active = await createInvite(admin);
    const used = await createInvite(admin);
    const expired = await createInvite(admin);
    await signUp({ token: used.token, email: 'new@test.local', password: 'a-long-password' });
    await t.db.query(`update invites set expires_at = now() - interval '1 day' where id = $1`, [expired.id]);
    // The clock can tick too slowly to tell three inserts apart, so make the order explicit.
    for (const [age, invite] of [active, used, expired].entries()) {
      await t.db.query(`update invites set created_at = now() - make_interval(mins => $1::int) where id = $2`, [
        10 - age,
        invite.id,
      ]);
    }

    const byId = new Map((await listInvites(admin)).map((invite) => [invite.id, invite]));
    expect(byId.get(active.id)?.status).toBe('active');
    expect(byId.get(used.id)).toMatchObject({ status: 'used', usedBy: 'new@test.local' });
    expect(byId.get(expired.id)?.status).toBe('expired');
    expect((await listInvites(admin)).map((invite) => invite.id)).toEqual([expired.id, used.id, active.id]);
  });

  it('revokes unused invites only, and only the creator can', async () => {
    const unused = await createInvite(admin);
    const used = await createInvite(admin);
    await consume(used.token);

    expect(await revokeInvite(t.userA, unused.id)).toBe(false);
    expect(await revokeInvite(admin, 'not-a-uuid')).toBe(false);
    expect(await revokeInvite(admin, used.id)).toBe(false);
    expect(await revokeInvite(admin, unused.id)).toBe(true);
    expect(await revokeInvite(admin, unused.id)).toBe(false);
    expect(await listInvites(t.userA)).toEqual([]);
  });
});
