export const SESSION_COOKIE = 'cp_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_TTL_SECONDS = SESSION_TTL_SECONDS;

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  return secret && secret !== '' ? secret : null;
}

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return base64url(new Uint8Array(signature));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Create a signed session token: `<expiry>.<HMAC-SHA256(expiry)>`. */
export async function signSession(ttlSeconds = DEFAULT_TTL_SECONDS): Promise<string> {
  const secret = sessionSecret();
  if (!secret) throw new Error('SESSION_SECRET is not set');
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${expiry}.${await hmac(secret, String(expiry))}`;
}

/** Verify signature and expiry. Returns false (never throws) when unset or malformed. */
export async function verifySession(token: string | undefined | null): Promise<boolean> {
  const secret = sessionSecret();
  if (!secret || !token) return false;
  const [expiry, signature] = token.split('.');
  if (!expiry || !signature) return false;
  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
  return constantTimeEqual(signature, await hmac(secret, expiry));
}

/** Constant-time password check against APP_PASSWORD. */
export async function checkPassword(input: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) throw new Error('APP_PASSWORD is not set');
  return constantTimeEqual(await hmac('password', input), await hmac('password', expected));
}

/** Set-Cookie value for a freshly signed session. */
export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

/** Set-Cookie value that clears the session. */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
