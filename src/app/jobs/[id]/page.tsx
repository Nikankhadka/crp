import AppNav from '../../../components/AppNav';
import JobDetail from '../../../components/JobDetail';

export const dynamic = 'force-dynamic';

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <JobDetail id={id} />
      </main>
    </>
  );
}
