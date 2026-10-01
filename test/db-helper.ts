import { openPglite, resetDb, setDbForTests, type Db } from '../src/server/db';
import { migrate } from '../src/server/migrations';

export interface TestDb {
  db: Db;
  userA: string;
  userB: string;
}

async function insertUser(db: Db, email: string): Promise<string> {
  const [row] = await db.query<{ id: string }>('insert into users (email) values ($1) returning id', [email]);
  return row.id;
}

/** A fresh in-memory migrated database, installed as the app's db, with users A and B. */
export async function freshDb(): Promise<TestDb> {
  await resetDb();
  const db = await openPglite();
  await migrate(db);
  setDbForTests(db);
  return { db, userA: await insertUser(db, 'a@test.local'), userB: await insertUser(db, 'b@test.local') };
}

export const SEED_FILES = {
  profileYaml: 'pageTarget: 1\n',
  resumeYaml: 'basics:\n  name: Test Person\nsummaries: []\nsections: []\nskills: []\n',
  personalMd: '# Personal\n',
};

/** Store the minimal valid seed bank for a user. */
export async function putBank(db: Db, userId: string): Promise<void> {
  await db.query('insert into banks (user_id, profile_yaml, resume_yaml, personal_md) values ($1, $2, $3, $4)', [
    userId,
    SEED_FILES.profileYaml,
    SEED_FILES.resumeYaml,
    SEED_FILES.personalMd,
  ]);
}
