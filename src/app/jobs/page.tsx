import Link from 'next/link';
import AppNav from '../../components/AppNav';
import StatusBadge from '../../components/StatusBadge';
import { currentUserId } from '../../server/currentUser';
import { listJobs } from '../../server/jobStore';

export const dynamic = 'force-dynamic';

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

export default async function JobsPage() {
  const jobs = await listJobs(await currentUserId());

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
            <p className="mt-1 text-sm text-slate-500">
              Every tailored resume, with its score and downloads.
            </p>
          </div>
          <Link
            href="/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
          >
            New tailoring
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">
              No tailored resumes yet. Paste a job description to create the first one.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate font-medium">{job.title}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(job.createdAt)}
                        {job.pages !== undefined ? ` · ${job.pages} page${job.pages === 1 ? '' : 's'}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                  {job.score !== undefined && (
                    <p className="mt-3 text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">{job.score.score}/100</span>{' '}
                      · {job.score.oneLineWhy}
                    </p>
                  )}
                  {job.status === 'error' && job.error !== undefined && job.error !== null && (
                    <p className="mt-3 text-sm text-rose-600">{job.error}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
