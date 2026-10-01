'use client';

import { useRef, useState, type FormEvent } from 'react';
import type { Invite, InviteStatus } from '../../../../server/invites';

const INPUT =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

const STATUS_STYLES: Record<InviteStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  used: 'bg-slate-100 text-slate-600',
  expired: 'bg-amber-100 text-amber-700',
};

// UTC so the server render and the browser agree on the day.
const formatDay = (iso: string): string =>
  new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso));

interface Created {
  link: string;
  email: string | null;
  expiresAt: string;
}

export default function InviteManager({ initial }: { initial: Invite[] }) {
  const [invites, setInvites] = useState(initial);
  const [email, setEmail] = useState('');
  const [ttlDays, setTtlDays] = useState('7');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const linkInput = useRef<HTMLInputElement>(null);

  async function create(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setCopyNote(null);
    try {
      const response = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim() === '' ? null : email, ttlDays: Number(ttlDays) }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        invite?: Invite & { token: string };
        error?: string;
      };
      if (!response.ok || data.invite === undefined) {
        setError(data.error ?? 'Could not create the invite');
        return;
      }
      const { token, ...invite } = data.invite;
      setCreated({
        link: `${window.location.origin}/signup?token=${encodeURIComponent(token)}`,
        email: invite.email,
        expiresAt: invite.expiresAt,
      });
      setInvites((current) => [invite, ...current]);
      setEmail('');
    } catch {
      setError('Could not reach the server');
    } finally {
      setCreating(false);
    }
  }

  async function copy() {
    if (created === null) return;
    try {
      await navigator.clipboard.writeText(created.link);
      setCopyNote('Copied');
    } catch {
      linkInput.current?.select();
      setCopyNote('Press Ctrl/Cmd+C to copy');
    }
  }

  async function revoke(id: string) {
    setError(null);
    try {
      const response = await fetch(`/api/admin/invites/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Could not revoke the invite');
        return;
      }
      setInvites((current) => current.filter((invite) => invite.id !== id));
    } catch {
      setError('Could not reach the server');
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={create} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-700">New invite</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_8rem]">
          <label className="block">
            <span className="text-sm text-slate-600">Email (optional)</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Anyone with the link"
              autoComplete="off"
              className={INPUT}
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600">Expires in (days)</span>
            <input
              type="number"
              value={ttlDays}
              onChange={(event) => setTtlDays(event.target.value)}
              min={1}
              max={90}
              step={1}
              required
              className={INPUT}
            />
          </label>
        </div>

        {error !== null && <p className="mt-4 text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={creating}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {creating ? 'Creating…' : 'Create invite'}
        </button>
      </form>

      {created !== null && (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-6">
          <h2 className="text-sm font-medium text-indigo-900">Signup link</h2>
          <p className="mt-1 text-xs text-indigo-800">
            Copy it now. It is shown only once and cannot be recovered later.
            {created.email !== null && ` Only ${created.email} can use it.`} Expires{' '}
            {formatDay(created.expiresAt)}.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              ref={linkInput}
              readOnly
              value={created.link}
              onFocus={(event) => event.currentTarget.select()}
              aria-label="Signup link"
              className="min-w-0 flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 outline-none"
            />
            <button
              type="button"
              onClick={copy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
            >
              Copy link
            </button>
          </div>
          {copyNote !== null && <p className="mt-2 text-xs text-indigo-800">{copyNote}</p>}
        </section>
      )}

      {invites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">No invites yet. Create one above to add a person.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[invite.status]}`}
                  >
                    {invite.status}
                  </span>
                  <span className="truncate text-sm font-medium">{invite.email ?? 'Anyone with the link'}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Created {formatDay(invite.createdAt)}
                  {invite.status === 'used' && invite.usedAt !== null
                    ? ` · used ${formatDay(invite.usedAt)}${invite.usedBy !== null ? ` by ${invite.usedBy}` : ''}`
                    : ` · ${invite.status === 'expired' ? 'expired' : 'expires'} ${formatDay(invite.expiresAt)}`}
                </p>
              </div>
              {invite.status !== 'used' && (
                <button
                  type="button"
                  onClick={() => revoke(invite.id)}
                  className="shrink-0 rounded-md px-3 py-1.5 text-sm text-rose-600 transition hover:bg-rose-50"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
