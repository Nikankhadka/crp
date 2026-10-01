import Link from 'next/link';
import { redirect } from 'next/navigation';
import AppNav from '../../components/AppNav';
import BankEditor from '../../components/BankEditor';
import { pageUser } from '../../server/currentUser';
import { getBankTexts } from '../../server/seedBank';

export const dynamic = 'force-dynamic';

export default async function BankPage() {
  const bank = await getBankTexts((await pageUser()).id);
  if (bank === null) redirect('/onboarding');

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Bank</h1>
            <p className="mt-1 text-sm text-slate-500">
              Every tailored resume is built only from these facts. Edit them here, or start over
              from a new resume.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Import a resume
          </Link>
        </div>
        <div className="mt-6">
          <BankEditor initial={bank} submitLabel="Save" />
        </div>
      </main>
    </>
  );
}
