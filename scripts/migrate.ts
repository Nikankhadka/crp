// Apply pending database migrations: DATABASE_URL when set, else the local PGlite dev database.
// Do not run this while `next dev` holds storage/pgdata open: PGlite allows one process at a time.
import { join } from 'node:path';
import { resolvePaths } from '../src/paths';
import { getDb } from '../src/server/db';
import { migrate } from '../src/server/migrations';

// loadEnvFile never overrides a variable that is already set, so load .env.local first for it to
// win over .env (the Next convention).
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file missing, use the ambient environment
  }
}

/** Where we are about to migrate. Host only, never credentials. */
function target(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return `PGlite ${join(resolvePaths().storageDir, 'pgdata')}`;
  try {
    return `postgres ${new URL(url).host}`;
  } catch {
    return 'postgres (unparseable DATABASE_URL)';
  }
}

const db = await getDb();
await migrate(db);
await db.close();
process.stdout.write(`migrations applied to ${target()}\n`);
