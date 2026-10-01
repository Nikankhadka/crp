import type { Db } from './db';

/**
 * Ordered, append-only schema migrations. Embedded as strings (not read from disk) because the
 * serverless filesystem ships only traced files. Never edit an applied migration; add a new one.
 */
export const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: '001_init',
    sql: `
      create table users (
        id uuid primary key default gen_random_uuid(),
        email text unique not null,
        created_at timestamptz not null default now()
      );

      create table banks (
        user_id uuid primary key references users (id) on delete cascade,
        profile_yaml text not null,
        resume_yaml text not null,
        personal_md text not null,
        updated_at timestamptz not null default now()
      );

      create table docs (
        user_id uuid not null references users (id) on delete cascade,
        category text not null,
        slug text not null,
        content text not null,
        updated_at timestamptz not null default now(),
        primary key (user_id, category, slug)
      );

      create table jobs (
        id text primary key,
        user_id uuid not null references users (id) on delete cascade,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        title text not null,
        status text not null,
        page_target int not null,
        doc_ids jsonb not null default '[]',
        jd text not null,
        score jsonb,
        gaps jsonb not null default '[]',
        keywords jsonb not null default '[]',
        pages int,
        passes int,
        error text
      );
      create index jobs_user_created_idx on jobs (user_id, created_at desc);

      create table artifacts (
        job_id text not null references jobs (id) on delete cascade,
        name text not null,
        content_type text not null,
        filename text not null,
        data bytea not null,
        primary key (job_id, name)
      );
    `,
  },
];

const LOCK_KEY = 7301001;

/** Apply unapplied migrations in one transaction. Idempotent and safe under concurrent starts. */
export async function migrate(db: Db): Promise<void> {
  await db.transaction(async (tx) => {
    // Transaction-scoped, so it releases on commit and also works behind a pooled connection.
    await tx.query(`select pg_advisory_xact_lock(${LOCK_KEY})`);
    await tx.query(
      'create table if not exists schema_migrations (id text primary key, applied_at timestamptz not null default now())',
    );
    const applied = new Set((await tx.query<{ id: string }>('select id from schema_migrations')).map((row) => row.id));
    for (const migration of MIGRATIONS) {
      if (applied.has(migration.id)) continue;
      await tx.query(migration.sql);
      await tx.query('insert into schema_migrations (id) values ($1)', [migration.id]);
    }
  });
}
