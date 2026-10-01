'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export interface BankTexts {
  profileYaml: string;
  resumeYaml: string;
  personalMd: string;
}

type Field = keyof BankTexts;

const FIELDS: { key: Field; label: string; hint: string; rows: number }[] = [
  {
    key: 'resumeYaml',
    label: 'resume.yaml',
    hint: 'Your facts: contact details, summaries, experience, education, skills. Each item and bullet keeps its id.',
    rows: 22,
  },
  {
    key: 'profileYaml',
    label: 'profile.yaml',
    hint: 'Settings such as the roles you are targeting and your region.',
    rows: 6,
  },
  {
    key: 'personalMd',
    label: 'personal.md',
    hint: 'Notes the engine should obey, such as things to never mention.',
    rows: 6,
  },
];

/**
 * The three bank documents as editable text. Save validates them on the server; a problem comes
 * back with the document it belongs to and shows under that textarea.
 */
export default function BankEditor({
  initial,
  warnings = [],
  submitLabel,
  redirectTo,
}: {
  initial: BankTexts;
  warnings?: string[];
  submitLabel: string;
  /** Where to go after a successful save. When absent the editor stays and says "Saved". */
  redirectTo?: '/new';
}) {
  const router = useRouter();
  const [texts, setTexts] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<Field | 'form', string>>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const dirty = FIELDS.some(({ key }) => texts[key] !== saved[key]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      const response = await fetch('/api/bank', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(texts),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; field?: Field };
      if (!response.ok) {
        setErrors({ [data.field ?? 'form']: data.error ?? 'Could not save the bank' });
        return;
      }
      if (redirectTo !== undefined) {
        router.push(redirectTo);
        router.refresh();
        return;
      }
      setSaved(texts);
      setMessage('Saved');
      router.refresh();
    } catch {
      setErrors({ form: 'Could not reach the server' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-medium text-amber-900">Check these before saving</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {FIELDS.map(({ key, label, hint, rows }) => (
        <label key={key} className="block">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <span className="mt-0.5 block text-xs text-slate-400">{hint}</span>
          <textarea
            value={texts[key]}
            onChange={(event) => setTexts((current) => ({ ...current, [key]: event.target.value }))}
            rows={rows}
            spellCheck={false}
            aria-invalid={errors[key] !== undefined}
            className={`mt-2 w-full resize-y rounded-xl border bg-white p-4 font-mono text-xs leading-relaxed shadow-sm outline-none focus:ring-2 ${
              errors[key] === undefined
                ? 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                : 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
            }`}
          />
          {errors[key] !== undefined && (
            <span role="alert" className="mt-1 block whitespace-pre-wrap text-sm text-rose-600">
              {errors[key]}
            </span>
          )}
        </label>
      ))}

      {errors.form !== undefined && (
        <p role="alert" className="text-sm text-rose-600">
          {errors.form}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || (redirectTo === undefined && !dirty)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
        {message !== null && <span className="text-sm text-slate-500">{message}</span>}
        {redirectTo === undefined && dirty && <span className="text-xs text-slate-400">Unsaved changes</span>}
      </div>
    </form>
  );
}
