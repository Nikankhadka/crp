import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cpilot-docs-'));
  process.env.STORAGE_DIR = dir;
});

afterEach(() => {
  delete process.env.STORAGE_DIR;
  delete process.env.MAX_DOC_BYTES;
  rmSync(dir, { recursive: true, force: true });
});

describe('docsStore', () => {
  it('saves and reads markdown with a title from the first heading', () => {
    const meta = upsertDoc('interview', 'interview-log', '# My Interview Log\n\nNotes.');
    expect(meta.id).toBe('interview/interview-log');
    expect(meta.title).toBe('My Interview Log');
    const doc = readDoc('interview/interview-log');
    expect(doc?.content).toContain('Notes.');
  });

  it('lists docs grouped by category and deletes them', () => {
    upsertDoc('memory', 'notes', '# Notes');
    upsertDoc('system-prompts', 'moe', '# MoE');
    const docs = listDocs();
    expect(docs.map((doc) => doc.id)).toEqual(['memory/notes', 'system-prompts/moe']);
    expect(deleteDoc('memory/notes')).toBe(true);
    expect(readDoc('memory/notes')).toBeNull();
  });

  it('rejects unsafe ids and unknown categories', () => {
    expect(parseDocId('../escape')).toBeNull();
    expect(parseDocId('nope/slug')).toBeNull();
    expect(parseDocId('memory/../x')).toBeNull();
    expect(parseDocId('memory/slug/extra')).toBeNull();
    expect(saveDoc('memory/..', 'x')).toBeNull();
    expect(deleteDoc('../../etc/passwd')).toBe(false);
  });

  it('derives slugs from titles and refuses duplicates', () => {
    expect(slugForTitle('Job Application MoE Prompt')).toBe('job-application-moe-prompt');
    createDoc('reference', 'Links', '# Links');
    expect(() => createDoc('reference', 'Links', '# Other')).toThrow('already exists');
  });

  it('enforces MAX_DOC_BYTES', () => {
    process.env.MAX_DOC_BYTES = '10';
    expect(() => upsertDoc('reference', 'big', '0123456789 extra')).toThrow(DocTooLargeError);
  });
});
