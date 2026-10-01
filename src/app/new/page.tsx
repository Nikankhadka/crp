import AppNav from '../../components/AppNav';
import NewJobForm from '../../components/NewJobForm';
import { bankPageUser } from '../../server/currentUser';
import { listDocs } from '../../server/docsStore';
import { discoveryConfig } from '../../server/discovery';

export const dynamic = 'force-dynamic';

const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

// A link from Discover prefills the form; only an http(s) url is accepted, anything else is ignored.
function httpUrl(value: string | undefined): string | undefined {
  try {
    return value !== undefined && ['http:', 'https:'].includes(new URL(value).protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string | string[]; title?: string | string[] }>;
}) {
  const docs = await listDocs((await bankPageUser()).id);
  const params = await searchParams;

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">New tailoring</h1>
        <p className="mt-1 text-sm text-slate-500">
          Paste the job description. The engine scores it, tailors your bank and renders the
          resume.
        </p>
        <NewJobForm
          docs={docs}
          firecrawl={discoveryConfig().firecrawl}
          initialUrl={httpUrl(first(params.url))}
          initialTitle={first(params.title)}
        />
      </main>
    </>
  );
}
