'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import type { DocMeta } from '../server/docsStore';

export default function NewJobForm({
  docs,
  firecrawl,
  initialUrl,
  initialTitle,
}: {
  docs: DocMeta[];
  firecrawl: boolean;
  initialUrl?: string;
  initialTitle?: string;
}) {
  const router = useRouter();
  const [jd, setJd] = useState('');
  const [title, setTitle] = useState(initialTitle ?? '');
  const [postingUrl, setPostingUrl] = useState(initialUrl ?? '');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [pageTarget, setPageTarget] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const grouped = useMemo(() => {
    const groups = new Map<string, DocMeta[]>();
    for (const doc of docs) {
      const list = groups.get(doc.category) ?? [];
      list.push(doc);
      groups.set(doc.category, list);
    }
    return [...groups.entries()];
  }, [docs]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  // Costs a Firecrawl credit, so it only runs on an explicit click, never on page load.
  async function importPosting() {
    setImporting(true);
    setImportError(null);
    try {
      const response = await fetch('/api/discovery/posting', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: postingUrl }),
      });
      const data = (await response.json().catch(() => ({}))) as { title?: string; text?: string; error?: string };
      if (!response.ok || data.text === undefined) {
        setImportError(data.error ?? 'Could not import that page');
        return;
      }
      setJd(data.text);
      if (title.trim() === '' && data.title) setTitle(data.title);
    } catch {
      setImportError('Could not reach the server');
    } finally {
      setImporting(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jd, title, pageTarget, docIds: selected }),
      });
      const data = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!response.ok || data.id === undefined) {
        setError(data.error ?? 'Could not start the job');
        return;
      }
      router.push(`/jobs/${data.id}`);
    } catch {
      setError('Could not reach the server');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {firecrawl ? (
          <div className="mb-5">
            <label htmlFor="posting-url" className="block text-sm font-medium text-slate-700">
              Import from URL
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="posting-url"
                type="text"
                inputMode="url"
                autoComplete="off"
                value={postingUrl}
                onChange={(event) => setPostingUrl(event.target.value)}
                onKeyDown={(event) => {
                  // Enter here fetches the page; it must not submit the whole form.
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    if (!importing && postingUrl.trim() !== '') void importPosting();
                  }
                }}
                placeholder="https://…"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={() => void importPosting()}
                disabled={importing || postingUrl.trim() === ''}
                className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                {importing ? 'Fetching…' : 'Fetch'}
              </button>
            </div>
            {importError !== null && (
              <p role="alert" className="mt-2 text-sm text-rose-600">
                {importError}
              </p>
            )}
          </div>
        ) : (
          <p className="mb-5 text-xs text-slate-500">
            Set <code className="rounded bg-slate-100 px-1 py-0.5">FIRECRAWL_API_KEY</code> to import from a URL; you
            can still paste the description.
            {initialUrl !== undefined && (
              <>
                {' '}
                <a
                  href={initialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Open the posting
                </a>
                .
              </>
            )}
          </p>
        )}

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Job description</span>
          <textarea
            value={jd}
            onChange={(event) => setJd(event.target.value)}
            required
            rows={14}
            placeholder="Paste the full job advertisement here…"
            className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Role or company (optional)"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Pages</span>
            <select
              value={pageTarget}
              onChange={(event) => setPageTarget(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value={1}>1 page</option>
              <option value={2}>2 pages</option>
            </select>
          </label>
        </div>
      </div>

      {docs.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-slate-700">Reference docs</h2>
            <span className="text-xs text-slate-400">{selected.length} selected</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Background context for this run only. Facts still come from the resume bank.
          </p>
          <div className="mt-3 space-y-4">
            {grouped.map(([category, items]) => (
              <div key={category}>
                <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                  {category.replaceAll('-', ' ')}
                </p>
                <div className="mt-2 space-y-1.5">
                  {items.map((doc) => (
                    <label key={doc.id} className="flex items-center gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.includes(doc.id)}
                        onChange={() => toggle(doc.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-slate-700">{doc.title}</span>
                      <span className="text-xs text-slate-400">
                        {Math.max(1, Math.round(doc.size / 1024))} KB
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error !== null && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={submitting || jd.trim() === ''}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {submitting ? 'Starting…' : 'Tailor resume'}
        </button>
      </div>
    </form>
  );
}
