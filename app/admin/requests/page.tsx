import { requireAdmin } from '@/lib/session';
import { pendingStatusRequests } from '@/lib/queries/tickets';
import { Empty } from '@/components/ui';
import RequestRow from './row';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Requests' };

export default async function Requests() {
  const me = await requireAdmin();
  const rows = await pendingStatusRequests(me);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Status requests</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-mid">
        Members asking to change their type — usually a student who has graduated.
        Approving takes effect from now, not retroactively: someone who graduated
        in December still owed that semester&apos;s dues.
      </p>

      {rows.length ? (
        <div className="space-y-3">{rows.map((r) => <RequestRow key={r.id} req={r} />)}</div>
      ) : (
        <Empty title="Nothing waiting" body="Requests appear here when a member asks to change their type." />
      )}
    </>
  );
}
