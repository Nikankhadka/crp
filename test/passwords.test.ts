import { describe, expect, it } from 'vitest';
import { hashPassword, MIN_PASSWORD_LENGTH, verifyAgainstDummy, verifyPassword } from '../src/server/passwords';

describe('passwords', () => {
  it('hashes to scrypt$salt$hash and verifies the right password', async () => {
    const stored = await hashPassword('correct horse battery');
    const [scheme, salt, hash, ...rest] = stored.split('$');
    expect(scheme).toBe('scrypt');
    expect(Buffer.from(salt, 'base64')).toHaveLength(16);
    expect(hash.length).toBeGreaterThan(0);
    expect(rest).toEqual([]);
    expect(await verifyPassword('correct horse battery', stored)).toBe(true);
  });

  it('rejects a wrong password, an empty one, and a near miss', async () => {
    const stored = await hashPassword('correct horse battery');
    expect(await verifyPassword('correct horse batterz', stored)).toBe(false);
    expect(await verifyPassword('', stored)).toBe(false);
    expect(await verifyPassword('correct horse battery ', stored)).toBe(false);
  });

  it('uses a fresh salt each time', async () => {
    expect(await hashPassword('same password')).not.toBe(await hashPassword('same password'));
  });

  it('never matches, and never throws on, a malformed stored hash', async () => {
    for (const stored of ['', 'plain', 'scrypt', 'scrypt$', 'scrypt$$', 'scrypt$abc', 'bcrypt$YWJj$YWJj', 'scrypt$YWJj$YWJj$extra']) {
      expect(await verifyPassword('anything', stored)).toBe(false);
    }
  });

  it('burns the verification time for an unknown account and always says no', async () => {
    expect(await verifyAgainstDummy('anything')).toBe(false);
  });

  it('exposes the minimum length signup enforces', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(10);
  });
});
