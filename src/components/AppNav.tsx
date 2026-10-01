import Link from 'next/link';
import LogoutButton from './LogoutButton';

export default function AppNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/jobs" className="text-lg font-semibold tracking-tight">
          cpilot
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/jobs"
            className="rounded-md px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Jobs
          </Link>
          <Link
            href="/new"
            className="rounded-md px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            New
          </Link>
          <Link
            href="/docs"
            className="rounded-md px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Docs
          </Link>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
