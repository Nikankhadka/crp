import type { Bank } from '../core/bank';
import type { MergedItem } from './typst';

function present(obj: object, keys: string[]): string[] {
  const record = obj as Record<string, unknown>;
  const values: string[] = [];
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value) !== '') values.push(String(value));
  }
  return values;
}

/** "location | phone | email | linkedin | github", mirroring resume.typ's contact line. */
export function contactLine(basics: Bank['basics']): string {
  return present(basics, ['location', 'phone', 'email', 'linkedin', 'github']).join(' | ');
}

/** "Title, Org (Jan 2020 – Present)", mirroring resume.typ's headerLine (en dash, never em dash). */
export function itemHeadline(item: MergedItem): string {
  const primary = present(item, ['title', 'name', 'credential'])[0];
  const org = present(item, ['org', 'institution'])[0];
  const dates =
    item.start !== undefined && item.end !== undefined
      ? `${item.start} – ${item.end}`
      : (item.start ?? item.end);
  const head = primary !== undefined && org !== undefined ? `${primary}, ${org}` : (primary ?? org);
  if (head !== undefined && dates !== undefined) return `${head} (${dates})`;
  return head ?? dates ?? '';
}
