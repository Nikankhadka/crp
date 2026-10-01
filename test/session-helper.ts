import { SESSION_COOKIE, signSession } from '../src/server/auth';

let current: string | undefined;

/** Stand-in for next/headers `cookies()`: route and page code reads the session cookie from here. */
export async function cookies(): Promise<{ get: (name: string) => { name: string; value: string } | undefined }> {
  return { get: (name) => (name === SESSION_COOKIE && current !== undefined ? { name, value: current } : undefined) };
}

export const setSessionToken = (token: string | undefined): void => {
  current = token;
};

/** Make the next requests come from this user. */
export async function signInAs(userId: string): Promise<void> {
  current = await signSession(userId);
}

export const signOut = (): void => {
  current = undefined;
};

/** A JSON POST/PUT request for calling route handlers directly. */
export function jsonRequest(method: string, body: unknown, url = 'http://localhost/api/test'): Request {
  return new Request(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
