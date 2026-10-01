'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import type { JobListing } from '../server/discovery';

const PAGE_SIZE = 20;
const MAX_PAGE = 50;

// Adzuna quotes salaries in each country's own currency.
const CURRENCIES: Record<string, string> = {
  gb: 'GBP', us: 'USD', au: 'AUD', at: 'EUR', br: 'BRL', ca: 'CAD', de: 'EUR', es: 'EUR', fr: 'EUR',
  in: 'INR', it: 'EUR', mx: 'MXN', nl: 'EUR', nz: 'NZD', pl: 'PLN', sg: 'SGD', za: 'ZAR',
};

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

function formatDate(iso: string): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(date);
}

function formatSalary(listing: JobListing, country: string): string | null {
  const { salaryMin: min, salaryMax: max } = listing;
  if (min === undefined && max === undefined) return null;
  const money = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: CURRENCIES[country] ?? 'USD',
    maximumFractionDigits: 0,
  });
  if (min !== undefined && max !== undefined && min !== max) return `${money.format(min)} - ${money.format(max)}`;
  return money.format((min ?? max)!);
}

export default function DiscoverSearch({
  config,
  countries,
  defaultCountry,
}: {
  config: { adzuna: boolean };
  countries: readonly string[];
  defaultCountry: string;
}) {
  const [what, setWhat] = useState('');
  const [where, setWhere] = useState('');
  const [country, setCountry] = useState(defaultCountry);
  // The query a result set came from: paging and salary currency follow it, not later edits to the form.
  const [results, setResults] = useState<{
    listings: JobListing[];
    total: number;
    page: number;
    query: { what: string; where: string; country: string };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!config.adzuna) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-700">Job search is not set up</p>
        <p className="mt-2 text-sm text-slate-500">
          Set <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">ADZUNA_APP_ID</code> and{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">ADZUNA_APP_KEY</code> to search listings here.
          You can still paste a job description on the New page.
        </p>
      </div>
    );
  }

  const regionNames = new Intl.DisplayNames('en', { type: 'region' });
  const pages = results === null ? 0 : Math.min(MAX_PAGE, Math.max(1, Math.ceil(results.total / PAGE_SIZE)));

  async function search(page: number, query = { what, where, country }) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ ...query, page: String(page) });
      const response = await fetch(`/api/discovery/search?${params}`);
      const data = (await response.json().catch(() => ({}))) as {
        listings?: JobListing[];
        total?: number;
        error?: string;
      };
      if (!response.ok || data.listings === undefined) {
        setError(data.error ?? 'Could not search jobs');
        return;
      }
      setResults({ listings: data.listings, total: data.total ?? data.listings.length, page, query });
    } catch {
      setError('Could not reach the server');
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void search(1);
  }

  return (
    <>
      <form onSubmit={submit} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_14rem_auto] lg:items-end">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Keywords</span>
            <input
              type="text"
              value={what}
              onChange={(event) => setWhat(event.target.value)}
              maxLength={200}
              placeholder="Job title or skill"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Place</span>
            <input
              type="text"
              value={where}
              onChange={(event) => setWhere(event.target.value)}
              maxLength={200}
              placeholder="City or region"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Country</span>
            <select value={country} onChange={(event) => setCountry(event.target.value)} className={inputClass}>
              {countries.map((code) => (
                <option key={code} value={code}>
                  {regionNames.of(code.toUpperCase()) ?? code.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={loading || (what.trim() === '' && where.trim() === '')}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60 sm:col-span-2 lg:col-span-1"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {error !== null && (
        <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {results === null && error === null && (
        <p className="mt-10 text-center text-sm text-slate-500">
          {loading ? 'Searching…' : 'Search by keyword, place, or both.'}
        </p>
      )}

      {results !== null && results.listings.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">No listings found. Try broader keywords or another place.</p>
        </div>
      )}

      {results !== null && results.listings.length > 0 && (
        <>
          <p className="mt-6 text-sm text-slate-500">
            {results.total.toLocaleString('en')} {results.total === 1 ? 'listing' : 'listings'}
          </p>
          <ul className={`mt-3 space-y-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            {results.listings.map((listing) => {
              const posted = listing.postedAt === undefined ? null : formatDate(listing.postedAt);
              const salary = formatSalary(listing, results.query.country);
              const label = [listing.title, listing.company].filter((part) => part !== '').join(' - ');
              return (
                <li key={listing.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <h2 className="font-medium wrap-break-word">{listing.title}</h2>
                      <p className="mt-1 text-sm text-slate-600 wrap-break-word">
                        {[listing.company, listing.location].filter((part) => part !== '').join(' · ')}
                      </p>
                      {(posted !== null || salary !== null) && (
                        <p className="mt-1 text-xs text-slate-500">
                          {[posted && `Posted ${posted}`, salary].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/new?url=${encodeURIComponent(listing.url)}&title=${encodeURIComponent(label)}`}
                      className="shrink-0 self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
                    >
                      Tailor resume
                    </Link>
                  </div>
                  {listing.snippet !== '' && (
                    <p className="mt-3 line-clamp-3 text-sm text-slate-600 wrap-break-word">{listing.snippet}</p>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void search(results.page - 1, results.query)}
              disabled={loading || results.page <= 1}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {results.page} of {pages}
            </span>
            <button
              type="button"
              onClick={() => void search(results.page + 1, results.query)}
              disabled={loading || results.page >= pages}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </>
  );
}
