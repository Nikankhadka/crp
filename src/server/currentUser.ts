import { getDb, type Db } from './db';

export function ownerEmail(): string {
  return process.env.OWNER_EMAIL?.trim() || 'owner@local';
}

/** Create the owner user on first use and return its id. */
export async function ensureOwnerUser(db: Db): Promise<string> {
  const [row] = await db.query<{ id: string }>(
    'insert into users (email) values ($1) on conflict (email) do update set email = excluded.email returning id',
    [ownerEmail()],
  );
  return row.id;
}

let cached: { db: Db; email: string; id: string } | undefined;

/**
 * The user every request acts as. Today that is the single owner behind the app password;
 * this is the one seam to replace with the signed-in session user.
 */
export async function currentUserId(): Promise<string> {
  const db = await getDb();
  const email = ownerEmail();
  if (cached?.db !== db || cached.email !== email) cached = { db, email, id: await ensureOwnerUser(db) };
  return cached.id;
}
