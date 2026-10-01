'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { JobMeta, JobStatus } from '../server/jobStore';
import StatusBadge from './StatusBadge';

const STAGES: { key: JobStatus; label: string }[] = [
  { key: 'scoring', label: 'Scoring the fit' },
  { key: 'tailoring', label: 'Tailoring bullets and summary' },
  { key: 'rendering', label: 'Rendering PDF and DOCX' },
];

const ORDER: JobStatus[] = ['queued', 'scoring', 'tailoring', 'rendering', 'done'];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

function Chip({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'indigo' }) {
  const styles =
    tone === 'indigo'
      ? 'bg-indigo-50 text-indigo-700 ring-indigo-100'
      : 'bg-slate-100 text-slate-700 ring-slate-200';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ring-1 ring-inset ${styles}`}>
      {children}
    </span>
  );
}

export default function JobDetail({ id }: { id: string }) {
  const router = useRouter();
  const [job, setJob] = useState<JobMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const response = await fetch(`/api/jobs/${id}`, { cache: 'no-store' });
        if (cancelled) return;
        if (!response.ok) {
          setError('Job not found');
          return;
        }
        const data = (await response.json()) as { job: JobMeta };
        if (cancelled) return;
        setJob(data.job);
        if (data.job.status !== 'done' && data.job.status !== 'error') {
          timer = setTimeout(poll, 1500);
        }
      } catch {
        if (!cancelled) setError('Could not load the job');
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [id]);

  async function remove() {
    if (!window.confirm('Delete this job and its files?')) return;
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
    router.push('/jobs');
    router.refresh();
  }

  if (error !== null) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (job === null) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-1/3 rounded bg-slate-200" />
        <div className="h-40 rounded-xl bg-slate-200" />
      </div>
    );
  }

  const running = job.status !== 'done' && job.status !== 'error';
  const currentIndex = ORDER.indexOf(job.status);
  const score = job.score;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{job.title}</h1>
            <StatusBadge status={job.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{formatDate(job.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/jobs"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            All jobs
          </Link>
          <button
            type="button"
            onClick={remove}
            className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-rose-600 shadow-sm transition hover:bg-rose-50"
          >
            Delete
          </button>
        </div>
      </div>

      {running && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-700">
            {job.status === 'queued' ? 'Queued…' : 'Working on your resume…'}
          </p>
          <ol className="mt-4 space-y-3">
            {STAGES.map((stage) => {
              const stageIndex = ORDER.indexOf(stage.key);
              const active = stageIndex === currentIndex;
              const complete = stageIndex < currentIndex;
              return (
                <li key={stage.key} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                      complete
                        ? 'bg-emerald-100 text-emerald-700'
                        : active
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {complete ? '✓' : active ? '•' : ''}
                  </span>
                  <span className={active ? 'font-medium text-slate-900' : 'text-slate-500'}>
                    {stage.label}
                  </span>
                  {active && (
                    <span className="h-1.5 w-1.5 animate-ping rounded-full bg-indigo-500" />
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-xs text-slate-400">
            This can take a minute or two; generations are free-model and serial.
          </p>
        </div>
      )}

      {job.status === 'error' && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
          <p className="text-sm font-medium text-rose-700">Generation failed</p>
          <p className="mt-1 text-sm text-rose-600">{job.error ?? 'Unknown error'}</p>
        </div>
      )}

      {job.status === 'done' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            {score !== undefined && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Fit score</p>
                    <p className="mt-1 text-4xl font-semibold tracking-tight">
                      {score.score}
                      <span className="text-lg font-normal text-slate-400">/100</span>
                    </p>
                  </div>
                  <Chip tone="indigo">seniority: {score.seniorityFit}</Chip>
                </div>
                <p className="mt-3 text-sm text-slate-600">{score.oneLineWhy}</p>
                {job.pages !== undefined && (
                  <p className="mt-3 text-xs text-slate-400">
                    Rendered {job.pages} page{job.pages === 1 ? '' : 's'}
                    {job.passes !== undefined && job.passes > 0
                      ? ` after ${job.passes} shrink pass${job.passes === 1 ? '' : 'es'}`
                      : ''}
                    .
                  </p>
                )}
              </div>
            )}

            {score !== undefined && score.keywordsToMirror.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-medium text-slate-700">Keywords mirrored</h2>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {score.keywordsToMirror.map((keyword) => (
                    <Chip key={keyword}>{keyword}</Chip>
                  ))}
                </div>
              </div>
            )}

            {score !== undefined &&
              (score.mustHavesMet.length > 0 || score.mustHavesMissing.length > 0) && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-medium text-slate-700">Must-haves</h2>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {score.mustHavesMet.map((item) => (
                      <li key={item} className="flex gap-2 text-slate-700">
                        <span className="text-emerald-600">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                    {score.mustHavesMissing.map((item) => (
                      <li key={item} className="flex gap-2 text-slate-500">
                        <span className="text-rose-500">✕</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {job.gaps.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-medium text-slate-700">Gaps</h2>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {job.gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}

            {score !== undefined && score.redFlags.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="text-sm font-medium text-amber-800">Red flags</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-700">
                  {score.redFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/api/jobs/${job.id}/pdf?download=1`}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
              >
                Download PDF
              </a>
              <a
                href={`/api/jobs/${job.id}/docx`}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Download DOCX
              </a>
              {job.artifacts.includes('coverLetter') && (
                <a
                  href={`/api/jobs/${job.id}/cover-letter`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Cover letter
                </a>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <iframe
                src={`/api/jobs/${job.id}/pdf`}
                title="Resume preview"
                className="h-[70vh] w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
