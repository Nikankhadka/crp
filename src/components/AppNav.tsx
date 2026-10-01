import Link from 'next/link';
import { pageUser } from '../server/currentUser';
import LogoutButton from './LogoutButton';

const LINKS = [
  { href: '/jobs', label: 'Jobs' },
  { href: '/discover', label: 'Discover' },
  { href: '/new', label: 'New' },
  { href: '/docs', label: 'Docs' },
  { href: '/bank', label: 'Bank' },
] as const;

export default async function AppNav() {
  const user = await pageUser();
  const links = user.role === 'admin' ? [...LINKS, { href: '/admin/invites', label: 'Invites' }] : LINKS;

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-3 min-[360px]:px-4">
        <Link href="/jobs" className="text-lg font-semibold tracking-tight">
          cpilot
        </Link>
        <nav className="flex items-center text-sm sm:gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-1.5 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 min-[360px]:px-2 sm:px-3"
            >
              {link.label}
            </Link>
          ))}
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
