import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../src/server/db';
import { getSeed, loadSeed, parseSeed } from '../src/server/seedBank';
import { freshDb, putBank, SEED_FILES, type TestDb } from './db-helper';

let t: TestDb;
let dir: string;

beforeEach(async () => {
  t = await freshDb();
  dir = mkdtempSync(join(tmpdir(), 'cpilot-seed-'));
});

afterEach(async () => {
  rmSync(dir, { recursive: true, force: true });
  await resetDb();
});

describe('seed bank', () => {
  it('parseSeed matches loadSeed over the same three documents', () => {
    writeFileSync(join(dir, 'profile.yaml'), SEED_FILES.profileYaml);
    writeFileSync(join(dir, 'resume.yaml'), SEED_FILES.resumeYaml);
    writeFileSync(join(dir, 'personal.md'), SEED_FILES.personalMd);
    expect(parseSeed(SEED_FILES)).toEqual(loadSeed(dir));
  });

  it('defaults pageTarget to one page when profile.yaml has none', () => {
    expect(parseSeed({ ...SEED_FILES, profileYaml: 'name: x\n' }).pageTarget).toBe(1);
    expect(parseSeed({ ...SEED_FILES, profileYaml: 'pageTarget: 2\n' }).pageTarget).toBe(2);
  });

  it('getSeed returns the stored seed for the user', async () => {
    await putBank(t.db, t.userA);
    expect(await getSeed(t.userA)).toEqual(parseSeed(SEED_FILES));
  });

  it('getSeed throws a clear error for a user without a bank', async () => {
    await putBank(t.db, t.userA);
    await expect(getSeed(t.userB)).rejects.toThrow('no seed bank for this user');
  });
});
