import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolvePaths } from '../paths';

export const DOC_CATEGORIES = [
  'system-prompts',
  'interview',
  'playbook',
  'memory',
  'resume-archive',
  'reference',
] as const;

export type DocCategory = (typeof DOC_CATEGORIES)[number];

export interface DocMeta {
  id: string;
  category: DocCategory;
  slug: string;
  title: string;
  updatedAt: string;
  size: number;
}

export class DocTooLargeError extends Error {}

export function maxDocBytes(): number {
  const raw = Number(process.env.MAX_DOC_BYTES);
  return Number.isFinite(raw) && raw > 0 ? raw : 512 * 1024;
}

function docsRoot(): string {
  return resolvePaths().docsDir;
}

export function isDocCategory(value: string): value is DocCategory {
  return (DOC_CATEGORIES as readonly string[]).includes(value);
}

function isSafeSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(slug);
}

/** Split `category/slug` and reject anything that could escape the docs directory. */
export function parseDocId(id: string): { category: DocCategory; slug: string } | null {
  const parts = id.split('/');
  if (parts.length !== 2) return null;
  const [category, slug] = parts;
  if (!isDocCategory(category) || !isSafeSlug(slug)) return null;
  return { category, slug };
}

export function slugForTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleFrom(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function metaFor(category: DocCategory, slug: string, content: string, updatedAt: Date): DocMeta {
  return {
    id: `${category}/${slug}`,
    category,
    slug,
    title: titleFrom(content, slug),
    updatedAt: updatedAt.toISOString(),
    size: Buffer.byteLength(content, 'utf8'),
  };
}

function docPath(category: DocCategory, slug: string): string {
  return join(/*turbopackIgnore: true*/ docsRoot(), category, `${slug}.md`);
}

/** Create or overwrite a doc. Throws DocTooLargeError past MAX_DOC_BYTES. */
export function upsertDoc(category: DocCategory, slug: string, content: string): DocMeta {
  if (!isSafeSlug(slug)) throw new Error(`invalid doc slug: ${slug}`);
  if (Buffer.byteLength(content, 'utf8') > maxDocBytes()) {
    throw new DocTooLargeError(`doc exceeds ${maxDocBytes()} bytes`);
  }
  const path = docPath(category, slug);
  mkdirSync(join(docsRoot(), category), { recursive: true });
  writeFileSync(path, content);
  return metaFor(category, slug, content, new Date());
}

export function listDocs(): DocMeta[] {
  const root = docsRoot();
  if (!existsSync(root)) return [];
  const docs: DocMeta[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !isDocCategory(entry.name)) continue;
    const category = entry.name;
    for (const file of readdirSync(join(root, category))) {
      if (!file.endsWith('.md')) continue;
      const slug = file.slice(0, -3);
      if (!isSafeSlug(slug)) continue;
      const path = join(root, category, file);
      const content = readFileSync(path, 'utf8');
      docs.push(metaFor(category, slug, content, statSync(path).mtime));
    }
  }
  return docs.sort(
    (a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title),
  );
}

export function readDoc(id: string): { meta: DocMeta; content: string } | null {
  const parsed = parseDocId(id);
  if (!parsed) return null;
  const path = docPath(parsed.category, parsed.slug);
  if (!existsSync(path)) return null;
  const content = readFileSync(path, 'utf8');
  return { meta: metaFor(parsed.category, parsed.slug, content, statSync(path).mtime), content };
}

/** Save an existing or new doc by id. */
export function saveDoc(id: string, content: string): DocMeta | null {
  const parsed = parseDocId(id);
  if (!parsed) return null;
  return upsertDoc(parsed.category, parsed.slug, content);
}

/** Create a doc from a title; throws when the derived slug already exists. */
export function createDoc(category: DocCategory, title: string, content: string): DocMeta {
  const slug = slugForTitle(title);
  if (slug === '') throw new Error('title must contain letters or digits');
  if (existsSync(docPath(category, slug))) throw new Error('a doc with that title already exists');
  return upsertDoc(category, slug, content);
}

export function deleteDoc(id: string): boolean {
  const parsed = parseDocId(id);
  if (!parsed) return false;
  const path = docPath(parsed.category, parsed.slug);
  if (!existsSync(path)) return false;
  rmSync(path);
  return true;
}
