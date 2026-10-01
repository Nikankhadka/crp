import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ensureBoot } from '../src/server/bootstrap';
import { resetDb } from '../src/server/db';
import { listDocs, readDoc, saveDoc } from '../src/server/docsStore';
import { ensureOwnerUser } from '../src/server/users';
import { freshDb, SEED_FILES, type TestDb } from './db-helper';

let t: TestDb;
let dir: string;

beforeEach(async () => {
  t = await freshDb();
  dir = mkdtempSync(join(tmpdir(), 'cpilot-boot-'));
  mkdirSync(join(dir, 'seed'));
  writeFileSync(join(dir, 'seed', 'profile.yaml'), SEED_FILES.profileYaml);
  writeFileSync(join(dir, 'seed', 'resume.yaml'), SEED_FILES.resumeYaml);
  writeFileSync(join(dir, 'seed', 'personal.md'), SEED_FILES.personalMd);
  mkdirSync(join(dir, 'docs'));
  writeFileSync(join(dir, 'docs', '07_project_memory_notes.md'), '# Project memory notes\n\nOriginal.');
  writeFileSync(join(dir, 'docs', '00_LINKS_INDEX.md'), '# Links\n');
  process.env.OWNER_EMAIL = 'boot@test.local';
  process.env.BOOTSTRAP_SEED_DIR = join(dir, 'seed');
  process.env.BOOTSTRAP_DOCS_DIR = join(dir, 'docs');
});

afterEach(async () => {
  delete process.env.OWNER_EMAIL;
  delete process.env.BOOTSTRAP_SEED_DIR;
  delete process.env.BOOTSTRAP_DOCS_DIR;
  rmSync(dir, { recursive: true, force: true });
  await resetDb();
});

describe('ensureBoot', () => {
  it('creates the owner, imports the seed bank and mapped docs', async () => {
    await ensureBoot();
    const owner = await ensureOwnerUser(t.db);
        const [bank] = await t.db.query<{ profile_yaml: string; resume_yaml: string; personal_md: string }>(
      'select profile_yaml, resume_yaml, personal_md from banks where user_id = $1',
      [owner],
    );
    expect(bank).toEqual({
      profile_yaml: SEED_FILES.profileYaml,
      resume_yaml: SEED_FILES.resumeYaml,
      personal_md: SEED_FILES.personalMd,
    });
    expect((await listDocs(owner)).map((doc) => doc.id)).toEqual(['memory/project-memory-notes', 'reference/links-index']);
  });

  it('is idempotent and never overwrites edited data', async () => {
    await ensureBoot();
    const owner = await ensureOwnerUser(t.db);
    await saveDoc(owner, 'memory/project-memory-notes', '# Project memory notes\n\nEdited.');
    await t.db.query(`update banks set personal_md = 'edited' where user_id = $1`, [owner]);

    await ensureBoot();
    await ensureBoot();

    expect((await readDoc(owner, 'memory/project-memory-notes'))?.content).toContain('Edited.');
    const [bank] = await t.db.query<{ personal_md: string }>('select personal_md from banks where user_id = $1', [owner]);
    expect(bank.personal_md).toBe('edited');
    expect(await t.db.query('select 1 from users where email = $1', ['boot@test.local'])).toHaveLength(1);
    expect(await t.db.query('select 1 from banks where user_id = $1', [owner])).toHaveLength(1);
  });

  it('skips the doc import when the user already has docs', async () => {
    const owner = await ensureOwnerUser(t.db);
    await saveDoc(owner, 'reference/mine', 'x');
    await ensureBoot();
    expect((await listDocs(owner)).map((doc) => doc.id)).toEqual(['reference/mine']);
  });

  it('imports nothing without BOOTSTRAP_* dirs, and skips an incomplete seed dir', async () => {
    delete process.env.BOOTSTRAP_DOCS_DIR;
    rmSync(join(dir, 'seed', 'personal.md'));
    await ensureBoot();
    const owner = await ensureOwnerUser(t.db);
    expect(await listDocs(owner)).toEqual([]);
    expect(await t.db.query('select 1 from banks where user_id = $1', [owner])).toHaveLength(0);
  });

  it('does not touch other users', async () => {
    await ensureBoot();
    expect(await listDocs(t.userA)).toEqual([]);
    expect(await t.db.query('select 1 from banks where user_id = $1', [t.userA])).toHaveLength(0);
  });
});
