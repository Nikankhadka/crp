import { getDb } from './db';

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

export function isDocCategory(value: string): value is DocCategory {
  return (DOC_CATEGORIES as readonly string[]).includes(value);
}

function isSafeSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(slug);
}

/** Split `category/slug`; null unless it is a known category and a safe slug. */
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

function assertWritable(slug: string, content: string): void {
  if (!isSafeSlug(slug)) throw new Error(`invalid doc slug: ${slug}`);
  if (Buffer.byteLength(content, 'utf8') > maxDocBytes()) {
    throw new DocTooLargeError(`doc exceeds ${maxDocBytes()} bytes`);
  }
}

/** Create or overwrite a doc. Throws DocTooLargeError past MAX_DOC_BYTES. */
export async function upsertDoc(
  userId: string,
  category: DocCategory,
  slug: string,
  content: string,
): Promise<DocMeta> {
  assertWritable(slug, content);
  const [row] = await (await getDb()).query<{ updated_at: Date }>(
    `insert into docs (user_id, category, slug, content) values ($1, $2, $3, $4)
     on conflict (user_id, category, slug) do update set content = excluded.content, updated_at = now()
     returning updated_at`,
    [userId, category, slug, content],
  );
  return metaFor(category, slug, content, row.updated_at);
}

// ponytail: listing loads every doc's full content to derive its title from the first heading.
// Fine at personal-doc scale; store a title column when lists or docs grow large.
export async function listDocs(userId: string): Promise<DocMeta[]> {
  const rows = await (await getDb()).query<{ category: DocCategory; slug: string; content: string; updated_at: Date }>(
    'select category, slug, content, updated_at from docs where user_id = $1',
    [userId],
  );
  return rows
    .filter((row) => isDocCategory(row.category) && isSafeSlug(row.slug))
    .map((row) => metaFor(row.category, row.slug, row.content, row.updated_at))
    .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
}

export async function readDoc(userId: string, id: string): Promise<{ meta: DocMeta; content: string } | null> {
  const parsed = parseDocId(id);
  if (!parsed) return null;
  const [row] = await (await getDb()).query<{ content: string; updated_at: Date }>(
    'select content, updated_at from docs where user_id = $1 and category = $2 and slug = $3',
    [userId, parsed.category, parsed.slug],
  );
  return row ? { meta: metaFor(parsed.category, parsed.slug, row.content, row.updated_at), content: row.content } : null;
}

/** Save an existing or new doc by id. */
export async function saveDoc(userId: string, id: string, content: string): Promise<DocMeta | null> {
  const parsed = parseDocId(id);
  if (!parsed) return null;
  return upsertDoc(userId, parsed.category, parsed.slug, content);
}

/** Create a doc from a title; throws when the derived slug already exists. */
export async function createDoc(
  userId: string,
  category: DocCategory,
  title: string,
  content: string,
): Promise<DocMeta> {
  const slug = slugForTitle(title);
  if (slug === '') throw new Error('title must contain letters or digits');
  assertWritable(slug, content);
  const [row] = await (await getDb()).query<{ updated_at: Date }>(
    `insert into docs (user_id, category, slug, content) values ($1, $2, $3, $4)
     on conflict (user_id, category, slug) do nothing returning updated_at`,
    [userId, category, slug, content],
  );
  if (!row) throw new Error('a doc with that title already exists');
  return metaFor(category, slug, content, row.updated_at);
}

export async function deleteDoc(userId: string, id: string): Promise<boolean> {
  const parsed = parseDocId(id);
  if (!parsed) return false;
  const rows = await (await getDb()).query(
    'delete from docs where user_id = $1 and category = $2 and slug = $3 returning slug',
    [userId, parsed.category, parsed.slug],
  );
  return rows.length > 0;
}
