import AppNav from '../../../components/AppNav';
import { adminPageUser } from '../../../server/currentUser';
import { listInvites } from '../../../server/invites';
import InviteManager from './components/InviteManager';

export const dynamic = 'force-dynamic';

export default async function InvitesPage() {
  const admin = await adminPageUser();
  const invites = await listInvites(admin.id);

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Invites</h1>
        <p className="mt-1 text-sm text-slate-500">
          Signing up needs an invite. Create a link, send it to the person, and they pick their own
          password.
        </p>
        <InviteManager initial={invites} />
      </main>
    </>
  );
}
