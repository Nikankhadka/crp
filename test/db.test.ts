import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openPglite } from '../src/server/db';
import { migrate } from '../src/server/migrations';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cpilot-db-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('openPglite', () => {
  it('creates missing parent dirs and persists data across reopen', async () => {
    const dataDir = join(dir, 'does', 'not', 'exist', 'pgdata');
    const first = await openPglite(dataDir);
    await migrate(first);
    await first.query("insert into users (email) values ('persist@test.local')");
    await first.close();

    const second = await openPglite(dataDir);
    await migrate(second);
    expect(await second.query('select email from users')).toEqual([{ email: 'persist@test.local' }]);
    await second.close();
  });

  it('rolls a failed transaction back', async () => {
    const db = await openPglite();
    await migrate(db);
    await expect(
      db.transaction(async (tx) => {
        await tx.query("insert into users (email) values ('rolled@back')");
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await db.query('select 1 from users')).toHaveLength(0);
    await db.close();
  });
});
