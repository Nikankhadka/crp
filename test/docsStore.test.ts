import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../src/server/db';
import {
  createDoc,
  deleteDoc,
  DocTooLargeError,
  listDocs,
  parseDocId,
  readDoc,
  saveDoc,
  slugForTitle,
  upsertDoc,
} from '../src/server/docsStore';
import { freshDb, type TestDb } from './db-helper';

let t: TestDb;

beforeEach(async () => {
  t = await freshDb();
});

afterEach(async () => {
  delete process.env.MAX_DOC_BYTES;
  await resetDb();
});

describe('docsStore', () => {
  it('saves and reads markdown with a title from the first heading', async () => {
    const meta = await upsertDoc(t.userA, 'interview', 'interview-log', '# My Interview Log\n\nNotes.');
    expect(meta.id).toBe('interview/interview-log');
    expect(meta.title).toBe('My Interview Log');
    const doc = await readDoc(t.userA, 'interview/interview-log');
    expect(doc?.content).toContain('Notes.');
  });

  it('overwrites on upsert and saves by id', async () => {
    await upsertDoc(t.userA, 'memory', 'notes', '# One');
    await saveDoc(t.userA, 'memory/notes', '# Two');
    expect(await listDocs(t.userA)).toHaveLength(1);
    expect((await readDoc(t.userA, 'memory/notes'))?.meta.title).toBe('Two');
  });

  it('lists docs grouped by category and deletes them', async () => {
    await upsertDoc(t.userA, 'memory', 'notes', '# Notes');
    await upsertDoc(t.userA, 'system-prompts', 'moe', '# MoE');
    const docs = await listDocs(t.userA);
    expect(docs.map((doc) => doc.id)).toEqual(['memory/notes', 'system-prompts/moe']);
    expect(await deleteDoc(t.userA, 'memory/notes')).toBe(true);
    expect(await readDoc(t.userA, 'memory/notes')).toBeNull();
    expect(await deleteDoc(t.userA, 'memory/notes')).toBe(false);
  });

  it('rejects unsafe ids and unknown categories', async () => {
    expect(parseDocId('../escape')).toBeNull();
    expect(parseDocId('nope/slug')).toBeNull();
    expect(parseDocId('memory/../x')).toBeNull();
    expect(parseDocId('memory/slug/extra')).toBeNull();
    expect(await saveDoc(t.userA, 'memory/..', 'x')).toBeNull();
    expect(await readDoc(t.userA, '../../etc/passwd')).toBeNull();
    expect(await deleteDoc(t.userA, '../../etc/passwd')).toBe(false);
  });

  it('derives slugs from titles and refuses duplicates', async () => {
    expect(slugForTitle('Job Application MoE Prompt')).toBe('job-application-moe-prompt');
    await createDoc(t.userA, 'reference', 'Links', '# Links');
    await expect(createDoc(t.userA, 'reference', 'Links', '# Other')).rejects.toThrow('already exists');
    expect((await readDoc(t.userA, 'reference/links'))?.content).toBe('# Links');
  });

  it('enforces MAX_DOC_BYTES', async () => {
    process.env.MAX_DOC_BYTES = '10';
    await expect(upsertDoc(t.userA, 'reference', 'big', '0123456789 extra')).rejects.toThrow(DocTooLargeError);
    await expect(createDoc(t.userA, 'reference', 'Big', '0123456789 extra')).rejects.toThrow(DocTooLargeError);
  });
});

describe('docsStore user isolation', () => {
  it('keeps the same slug independent per user', async () => {
    await upsertDoc(t.userA, 'memory', 'notes', '# A notes');
    await upsertDoc(t.userB, 'memory', 'notes', '# B notes');
    expect((await readDoc(t.userA, 'memory/notes'))?.content).toBe('# A notes');
    expect((await readDoc(t.userB, 'memory/notes'))?.content).toBe('# B notes');

    await saveDoc(t.userB, 'memory/notes', '# B edited');
    expect((await readDoc(t.userA, 'memory/notes'))?.content).toBe('# A notes');
  });

  it('hides another user\'s docs from list, read and delete', async () => {
    await upsertDoc(t.userA, 'memory', 'private', '# Private');
    expect(await listDocs(t.userB)).toEqual([]);
    expect(await readDoc(t.userB, 'memory/private')).toBeNull();
    expect(await deleteDoc(t.userB, 'memory/private')).toBe(false);
    expect(await readDoc(t.userA, 'memory/private')).not.toBeNull();
  });

  it('lets two users create a doc with the same title', async () => {
    await createDoc(t.userA, 'reference', 'Links', '# A');
    await expect(createDoc(t.userB, 'reference', 'Links', '# B')).resolves.toMatchObject({ id: 'reference/links' });
  });
});
