import { createHash, randomBytes } from 'node:crypto';
import { getDb, type Queryable } from './db';

export const INVALID_INVITE = 'invalid or expired invite';

/** Any problem with a signup token. One message, so a caller cannot tell which problem it was. */
export class InviteError extends Error {
  constructor() {
    super(INVALID_INVITE);
  }
}

export type InviteStatus = 'active' | 'used' | 'expired';

export interface Invite {
  id: string;
  /** When set, only this email can redeem the invite. */
  email: string | null;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  /** Email of the account that redeemed it. */
  usedBy: string | null;
  status: InviteStatus;
}

export const DEFAULT_INVITE_TTL_DAYS = 7;
export const MAX_INVITE_TTL_DAYS = 90;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string): boolean => UUID.test(value);

/** Only this hash is stored, so a leaked database cannot be used to sign up. */
const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

interface InviteRow {
  id: string;
  email: string | null;
  created_at: Date;
  expires_at: Date;
  used_at: Date | null;
  used_by_email: string | null;
  status: InviteStatus;
}

const INVITE_SELECT = `select i.id, i.email, i.created_at, i.expires_at, i.used_at, u.email as used_by_email,
  case when i.used_at is not null then 'used' when i.expires_at <= now() then 'expired' else 'active' end as status
  from invites i left join users u on u.id = i.used_by`;

function toInvite(row: InviteRow): Invite {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    usedAt: row.used_at?.toISOString() ?? null,
    usedBy: row.used_by_email,
    status: row.status,
  };
}

/** Create an invite. The raw token is returned here once and never stored. */
export async function createInvite(
  adminId: string,
  { email, ttlDays = DEFAULT_INVITE_TTL_DAYS }: { email?: string | null; ttlDays?: number } = {},
): Promise<Invite & { token: string }> {
  const token = randomBytes(32).toString('base64url');
  const invitee = email?.trim().toLowerCase() || null;
  const [row] = await (await getDb()).query<{ id: string; created_at: Date; expires_at: Date }>(
    `insert into invites (token_hash, email, created_by, expires_at)
     values ($1, $2, $3, now() + make_interval(days => $4::int)) returning id, created_at, expires_at`,
    [hashToken(token), invitee, adminId, ttlDays],
  );
  return {
    id: row.id,
    email: invitee,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    usedAt: null,
    usedBy: null,
    status: 'active',
    token,
  };
}

export async function listInvites(adminId: string): Promise<Invite[]> {
  const rows = await (await getDb()).query<InviteRow>(
    `${INVITE_SELECT} where i.created_by = $1 order by i.created_at desc, i.id desc`,
    [adminId],
  );
  return rows.map(toInvite);
}

/** Delete an unused invite (active or expired). Used invites stay as a record. */
export async function revokeInvite(adminId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const rows = await (await getDb()).query(
    'delete from invites where id = $1 and created_by = $2 and used_at is null returning id',
    [id, adminId],
  );
  return rows.length > 0;
}

/**
 * Mark the invite used, inside the signup transaction. One conditional UPDATE, so two signups
 * racing on the same token cannot both win: the loser re-checks `used_at is null` after the
 * winner commits and matches nothing. Returns the invite id; throws InviteError otherwise.
 */
export async function consumeInvite(tx: Queryable, token: string, email: string): Promise<string> {
  const [row] = await tx.query<{ id: string }>(
    `update invites set used_at = now()
     where token_hash = $1 and used_at is null and expires_at > now() and (email is null or email = $2)
     returning id`,
    [hashToken(token), email.trim().toLowerCase()],
  );
  if (!row) throw new InviteError();
  return row.id;
}
