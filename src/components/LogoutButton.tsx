'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
      }}
      className="rounded-md px-3 py-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
    >
      Log out
    </button>
  );
}
