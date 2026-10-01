'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { DocMeta } from '../server/docsStore';
import Markdown from './Markdown';

export default function DocEditor({ id }: { id: string }) {
  const router = useRouter();
  const [meta, setMeta] = useState<DocMeta | null>(null);
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/docs/${id}`, { cache: 'no-store' });
        if (!response.ok) {
          setError('Doc not found');
          return;
        }
        const data = (await response.json()) as { doc: { meta: DocMeta; content: string } };
        if (cancelled) return;
        setMeta(data.doc.meta);
        setContent(data.doc.content);
        setOriginal(data.doc.content);
      } catch {
        if (!cancelled) setError('Could not load the doc');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/docs/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? 'Could not save');
        return;
      }
      setOriginal(content);
      setMessage('Saved');
      router.refresh();
    } catch {
      setMessage('Could not reach the server');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm('Delete this doc?')) return;
    await fetch(`/api/docs/${id}`, { method: 'DELETE' });
    router.push('/docs');
    router.refresh();
  }

  if (error !== null) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error} · <Link href="/docs" className="underline">Back to docs</Link>
      </div>
    );
  }

  if (meta === null) {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-200" />;
  }

  const dirty = content !== original;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/docs" className="text-sm text-slate-500 hover:text-slate-700">
            ← Docs
          </Link>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight">{meta.title}</h1>
          <p className="text-xs text-slate-400">{meta.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreview((value) => !value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={remove}
            className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-rose-600 shadow-sm transition hover:bg-rose-50"
          >
            Delete
          </button>
        </div>
      </div>

      {message !== null && <p className="text-sm text-slate-500">{message}</p>}

      {preview ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <Markdown content={content} />
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          spellCheck={false}
          className="h-[65vh] w-full resize-y rounded-xl border border-slate-200 bg-white p-5 font-mono text-xs leading-relaxed shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      )}

      <p className="text-xs text-slate-400">
        {new TextEncoder().encode(content).length} bytes{dirty ? ' · unsaved changes' : ''}
      </p>
    </div>
  );
}
