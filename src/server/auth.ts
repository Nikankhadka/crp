export const SESSION_COOKIE = 'cp_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_TTL_SECONDS = SESSION_TTL_SECONDS;

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const MIN_PRODUCTION_SECRET_LENGTH = 32;

/**
 * In production a short secret (which includes the `replace-me` placeholder from .env.example)
 * counts as missing, so the app fails closed instead of signing with a guessable key.
 */
function sessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  if (process.env.NODE_ENV === 'production' && secret.length < MIN_PRODUCTION_SECRET_LENGTH) return null;
  return secret;
}

/**
 * Login and signup only accept application/json. A cross-site HTML form can send nothing but
 * form-encoded or text/plain bodies, so refusing those stops it signing a victim into an
 * attacker's account (login CSRF).
 */
export const isJsonRequest = (request: Request): boolean =>
  (request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json');

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

/** Create a signed session token: `<userId>.<expiry>.<HMAC-SHA256(userId.expiry)>`. */
export async function signSession(userId: string, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<string> {
  const secret = sessionSecret();
  if (!secret) throw new Error('SESSION_SECRET is not set');
  const payload = `${userId}.${Math.floor(Date.now() / 1000) + ttlSeconds}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

/**
 * Verify signature and expiry and return the user id it was issued to, or null (never throws)
 * when unset, malformed, tampered or expired. Whether the user still exists is the caller's job.
 */
export async function verifySession(token: string | undefined | null): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, expiry, signature] = parts;
  if (!userId || !signature) return null;
  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
  return constantTimeEqual(signature, await hmac(secret, `${userId}.${expiry}`)) ? userId : null;
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
