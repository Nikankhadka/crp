import Link from 'next/link';
import AppNav from '../../components/AppNav';
import NewDocForm from '../../components/NewDocForm';
import { pageUser } from '../../server/currentUser';
import { DOC_CATEGORIES, listDocs } from '../../server/docsStore';

export const dynamic = 'force-dynamic';

export default async function DocsPage() {
  const docs = await listDocs((await pageUser()).id);
  const groups = DOC_CATEGORIES.map((category) => ({
    category,
    docs: docs.filter((doc) => doc.category === category),
  })).filter((group) => group.docs.length > 0);

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Docs</h1>
            <p className="mt-1 text-sm text-slate-500">
              System prompts, playbooks and notes. Select them on a run to give the engine context.
            </p>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">
              No docs yet. Create one below to give the engine extra context.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {groups.map((group) => (
              <section key={group.category}>
                <h2 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {group.category.replaceAll('-', ' ')}
                </h2>
                <ul className="mt-3 space-y-2">
                  {group.docs.map((doc) => (
                    <li key={doc.id}>
                      <Link
                        href={`/docs/${doc.category}/${doc.slug}`}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-indigo-200 hover:shadow"
                      >
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {doc.id} · {Math.max(1, Math.round(doc.size / 1024))} KB
                          </p>
                        </div>
                        <span className="text-sm text-slate-400">Edit →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <div className="mt-10">
          <NewDocForm categories={[...DOC_CATEGORIES]} />
        </div>
      </main>
    </>
  );
}
