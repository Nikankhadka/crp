import Link from 'next/link';
import SignupForm from './components/SignupForm';

export const dynamic = 'force-dynamic';

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  const inviteToken = typeof token === 'string' ? token : '';

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">cpilot</h1>
        {inviteToken === '' ? (
          <>
            <p className="mt-1 text-sm text-slate-500">Signing up needs an invite link.</p>
            <p className="mt-4 text-sm text-slate-600">
              Ask the person who runs this app for one, then open the link they send you. Already
              have an account?{' '}
              <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
              .
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500">Create your account to tailor your resume.</p>
            <SignupForm token={inviteToken} />
            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
