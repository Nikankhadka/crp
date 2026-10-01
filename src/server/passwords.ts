import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const MIN_PASSWORD_LENGTH = 10;
// Longer than any real password; stops a huge string being fed to scrypt.
export const MAX_PASSWORD_LENGTH = 1024;
const SALT_BYTES = 16;
const KEY_BYTES = 64;

/** `scrypt$<salt base64>$<hash base64>`, with a fresh random salt per password. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scryptAsync(password, salt, KEY_BYTES);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

/** Constant-time check. A malformed stored hash never matches (and never throws). */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltText, hashText, ...extra] = stored.split('$');
  if (scheme !== 'scrypt' || !saltText || !hashText || extra.length > 0) return false;
  const salt = Buffer.from(saltText, 'base64');
  const expected = Buffer.from(hashText, 'base64');
  if (salt.length === 0 || expected.length === 0) return false;
  try {
    return timingSafeEqual(await scryptAsync(password, salt, expected.length), expected);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Burn the same scrypt time as a real check, so an unknown email takes as long to reject as a
 * wrong password. Always returns false.
 */
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  await verifyPassword(password, await dummyHash);
  return false;
}
