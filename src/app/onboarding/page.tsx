import AppNav from '../../components/AppNav';
import { pageUser } from '../../server/currentUser';
import { hasBank } from '../../server/seedBank';
import ResumeImport from './components/ResumeImport';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const replacing = await hasBank((await pageUser()).id);

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Import your resume</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your resume becomes your bank, the set of facts every tailored resume is built from.
          Nothing is saved until you review it.
        </p>
        {replacing && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You already have a bank. Saving a new import replaces it.
          </p>
        )}
        <ResumeImport />
      </main>
    </>
  );
}
