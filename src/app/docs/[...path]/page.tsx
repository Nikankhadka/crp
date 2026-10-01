import AppNav from '../../../components/AppNav';
import DocEditor from '../../../components/DocEditor';

export const dynamic = 'force-dynamic';

export default async function DocPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <DocEditor id={path.join('/')} />
      </main>
    </>
  );
}
