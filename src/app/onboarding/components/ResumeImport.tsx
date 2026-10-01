'use client';

import { useState, type FormEvent } from 'react';
import BankEditor, { type BankTexts } from '../../../components/BankEditor';
import { MAX_PDF_BYTES } from '../../../core/limits';

interface Draft extends BankTexts {
  warnings: string[];
}

export default function ResumeImport() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runImport(event: FormEvent) {
    event.preventDefault();
    if (file === null && text.trim() === '') {
      setError('Paste your resume text or choose a PDF.');
      return;
    }
    if (file !== null && file.size > MAX_PDF_BYTES) {
      setError('That PDF is larger than 5 MB.');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      let init: RequestInit;
      if (file !== null) {
        const form = new FormData();
        form.set('file', file);
        init = { method: 'POST', body: form };
      } else {
        init = {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text }),
        };
      }
      const response = await fetch('/api/bank/import', init);
      const data = (await response.json().catch(() => ({}))) as Partial<Draft> & { error?: string };
      if (!response.ok || data.resumeYaml === undefined) {
        setError(data.error ?? 'Could not import the resume');
        return;
      }
      setDraft({
        profileYaml: data.profileYaml ?? '',
        resumeYaml: data.resumeYaml,
        personalMd: data.personalMd ?? '',
        warnings: data.warnings ?? [],
      });
    } catch {
      setError('Could not reach the server');
    } finally {
      setImporting(false);
    }
  }

  if (draft !== null) {
    return (
      <div className="mt-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">Step 2 of 2.</span> Review what was read from
            your resume and fix anything that is off.
          </p>
          <button
            type="button"
            onClick={() => setDraft(null)}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Back to import
          </button>
        </div>
        <BankEditor
          initial={draft}
          warnings={draft.warnings}
          submitLabel="Save and continue"
          redirectTo="/new"
        />
      </div>
    );
  }

  return (
    <form onSubmit={runImport} className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-900">Step 1 of 2.</span> Paste your resume text, or
        upload a PDF.
      </p>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Resume text</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={importing || file !== null}
          rows={14}
          placeholder="Paste your resume here"
          className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Or a PDF (up to 5 MB)</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={importing}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-slate-700 hover:file:bg-slate-50"
          />
        </label>
      </div>
      {file !== null && (
        <p className="text-xs text-slate-500">
          Using {file.name}; the pasted text is ignored.{' '}
          <button type="button" onClick={() => setFile(null)} className="underline hover:text-slate-700">
            Clear file
          </button>
        </p>
      )}

      {error !== null && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={importing}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {importing ? 'Importing…' : 'Import'}
        </button>
        {importing && (
          <span role="status" className="text-sm text-slate-500">
            Reading your resume. This can take up to a minute.
          </span>
        )}
      </div>
    </form>
  );
}
