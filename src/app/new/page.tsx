import AppNav from '../../components/AppNav';
import NewJobForm from '../../components/NewJobForm';
import { currentUserId } from '../../server/currentUser';
import { listDocs } from '../../server/docsStore';

export const dynamic = 'force-dynamic';

export default async function NewJobPage() {
  const docs = await listDocs(await currentUserId());

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">New tailoring</h1>
        <p className="mt-1 text-sm text-slate-500">
          Paste the job description. The engine scores it, tailors your bank and renders the
          resume.
        </p>
        <NewJobForm docs={docs} />
      </main>
    </>
  );
}
