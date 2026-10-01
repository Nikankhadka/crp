import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite, Transaction } from '@electric-sql/pglite';
import type { Pool, PoolClient } from 'pg';
import { resolvePaths } from '../paths';

export interface Queryable {
  /**
   * Rows only, with `$1` params. Without params the SQL runs on the simple protocol, so it may
   * hold several statements (the rows of the last one come back). Bytea is a Buffer.
   */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  /** Run `fn` on one connection inside BEGIN/COMMIT; rolls back when it throws. */
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const toBuffer = (value: unknown): unknown =>
  value instanceof Uint8Array && !Buffer.isBuffer(value)
    ? Buffer.from(value.buffer, value.byteOffset, value.byteLength)
    : value;

function pgliteQueryable(client: PGlite | Transaction): Queryable {
  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const result = params?.length ? await client.query(sql, params) : (await client.exec(sql)).at(-1);
      return (result?.rows ?? []).map((row) =>
        Object.fromEntries(Object.entries(row as object).map(([key, value]) => [key, toBuffer(value)])),
      ) as T[];
    },
  };
}

/** Embedded Postgres: in memory without a data dir (tests), on disk with one (local dev). */
export async function openPglite(dataDir?: string): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  // PGlite does not create missing parent directories (a fresh checkout has no storage/).
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const pglite = new PGlite(dataDir);
  await pglite.waitReady;
  return {
    ...pgliteQueryable(pglite),
    transaction: (fn) => pglite.transaction((tx) => fn(pgliteQueryable(tx))),
    close: () => pglite.close(),
  };
}

function pgQueryable(client: Pool | PoolClient): Queryable {
  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const result = await client.query(sql, params?.length ? params : undefined);
      return ((Array.isArray(result) ? result.at(-1) : result)?.rows ?? []) as T[];
    },
  };
}

/** Postgres over a small pool. The connection string is used as-is (Supabase pooler, sslmode). */
async function openPostgres(connectionString: string): Promise<Db> {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString, max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 });
  // An idle client dropped by the pooler emits 'error'; without a listener that kills the process.
  pool.on('error', (err) => console.warn(`postgres pool error: ${err.message}`));
  return {
    ...pgQueryable(pool),
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const result = await fn(pgQueryable(client));
        await client.query('commit');
        return result;
      } catch (err) {
        await client.query('rollback').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

// On globalThis so Next dev module reloads and separately bundled routes share one pool.
const slot = globalThis as { __cpilotDb?: Promise<Db> };

async function open(): Promise<Db> {
  const url = process.env.DATABASE_URL?.trim();
  if (url) return openPostgres(url);
  return openPglite(process.env.NODE_ENV === 'test' ? undefined : join(resolvePaths().storageDir, 'pgdata'));
}

/** DATABASE_URL selects Postgres; otherwise embedded PGlite (in memory under test). */
export function getDb(): Promise<Db> {
  return (slot.__cpilotDb ??= open().catch((err: unknown) => {
    slot.__cpilotDb = undefined;
    throw err;
  }));
}

export function setDbForTests(db: Db): void {
  slot.__cpilotDb = Promise.resolve(db);
}

/** Close and forget the current database so the next `getDb()` opens a new one. */
export async function resetDb(): Promise<void> {
  const current = slot.__cpilotDb;
  slot.__cpilotDb = undefined;
  await (await current)?.close();
}
