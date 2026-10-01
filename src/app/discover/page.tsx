import AppNav from '../../components/AppNav';
import DiscoverSearch from '../../components/DiscoverSearch';
import { bankPageUser } from '../../server/currentUser';
import { COUNTRIES, defaultCountry, discoveryConfig } from '../../server/discovery';

export const dynamic = 'force-dynamic';

export default async function DiscoverPage() {
  await bankPageUser();

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search real job listings, then tailor your resume to the one you pick.
        </p>
        <DiscoverSearch config={discoveryConfig()} countries={COUNTRIES} defaultCountry={defaultCountry()} />
      </main>
    </>
  );
}
