import { getDb, type Db } from './db';
import { consumeInvite, INVALID_INVITE, InviteError, isUuid } from './invites';
import { hashPassword, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from './passwords';

export type Role = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  role: Role;
  disabled: boolean;
  passwordHash: string | null;
}

interface UserRow {
  id: string;
  email: string;
  role: Role;
  disabled: boolean;
  password_hash: string | null;
}

const USER_COLUMNS = 'id, email, role, disabled, password_hash';

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  role: row.role,
  disabled: row.disabled,
  passwordHash: row.password_hash,
});

export function ownerEmail(): string {
  return (process.env.OWNER_EMAIL?.trim() || 'owner@local').toLowerCase();
}

/** The lowercased email, or null when it is not a plausible address. */
export function parseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export async function getUserById(id: string): Promise<User | null> {
  if (!isUuid(id)) return null;
  const [row] = await (await getDb()).query<UserRow>(`select ${USER_COLUMNS} from users where id = $1`, [id]);
  return row ? toUser(row) : null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const [row] = await (await getDb()).query<UserRow>(
    `select ${USER_COLUMNS} from users where lower(email) = $1`,
    [email.trim().toLowerCase()],
  );
  return row ? toUser(row) : null;
}

/**
 * Create the owner (the admin) on first use and return its id. The owner's password is seeded
 * from APP_PASSWORD only while it has none, so changing the variable later never overrides a
 * password the owner already has.
 */
export async function ensureOwnerUser(db: Db): Promise<string> {
  const [owner] = await db.query<{ id: string; password_hash: string | null }>(
    `insert into users (email, role) values ($1, 'admin')
     on conflict (lower(email)) do update set role = 'admin'
     returning id, password_hash`,
    [ownerEmail()],
  );
  const password = process.env.APP_PASSWORD;
  if (password && !owner.password_hash) {
    // The .env.example placeholder is exactly the minimum length, so it needs its own check.
    if (password.length < MIN_PASSWORD_LENGTH || password === 'replace-me') {
      console.warn(
        `APP_PASSWORD is a placeholder or shorter than ${MIN_PASSWORD_LENGTH} characters, so the owner has no password yet`,
      );
    } else {
      await db.query('update users set password_hash = $2 where id = $1 and password_hash is null', [
        owner.id,
        await hashPassword(password),
      ]);
    }
  }
  return owner.id;
}

/** A signup problem the caller can show: `status` is the HTTP status to answer with. */
export class SignupError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 409,
  ) {
    super(message);
  }
}

/**
 * Create a regular user from an invite. The invite is consumed first and in the same transaction
 * as the insert, so a bad token never reveals whether the email is taken, and a taken email
 * rolls the invite back unused.
 */
export async function signUp(input: { token?: unknown; email?: unknown; password?: unknown }): Promise<User> {
  const email = parseEmail(input.email);
  if (email === null) throw new SignupError('enter a valid email address', 400);
  const { token, password } = input;
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new SignupError(`password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters`, 400);
  }
  if (typeof token !== 'string' || token === '') throw new SignupError(INVALID_INVITE, 400);

  const passwordHash = await hashPassword(password);
  try {
    return await (await getDb()).transaction(async (tx) => {
      const inviteId = await consumeInvite(tx, token, email);
      const [row] = await tx.query<UserRow>(
        `insert into users (email, password_hash) values ($1, $2)
         on conflict do nothing returning ${USER_COLUMNS}`,
        [email, passwordHash],
      );
      if (!row) throw new SignupError('an account with that email already exists', 409);
      await tx.query('update invites set used_by = $1 where id = $2', [row.id, inviteId]);
      return toUser(row);
    });
  } catch (err) {
    if (err instanceof InviteError) throw new SignupError(INVALID_INVITE, 400);
    throw err;
  }
}
