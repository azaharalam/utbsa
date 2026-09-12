import { requirePermission } from '@/lib/session';
import { listPending, awaitingConfirmation } from '@/lib/queries/members';
import { Empty } from '@/components/ui';
import ApprovalRow from './row';
import Unconfirmed from './unconfirmed';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Approvals' };

export default async function Approvals() {
  const me = await requirePermission('members');
  const [pending, unconfirmed] = await Promise.all([
    listPending(me),
    awaitingConfirmation(me),
  ]);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Pending approvals</h1>
      <p className="mb-6 text-sm text-ink-mid">
        {pending.length
          ? `${pending.length} ${pending.length === 1 ? 'person is' : 'people are'} waiting. All have confirmed their email address.`
          : 'Nobody is waiting.'}
      </p>

      {pending.length ? (
        <div className="space-y-3">{pending.map((p) => <ApprovalRow key={p.id} member={p} />)}</div>
      ) : (
        <Empty title="Queue is clear" body="New signups appear here after they confirm their email address." />
      )}

      <Unconfirmed people={unconfirmed} />
    </>
  );
}
