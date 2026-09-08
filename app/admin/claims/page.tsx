import { requirePermission } from '@/lib/session';
import { listClaims, claimCounts } from '@/lib/queries/claims';
import { getSettings } from '@/lib/queries/settings';
import { Card, Pill, Empty } from '@/components/ui';
import ClaimRow from './row';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Transfers' };

export default async function Claims({ searchParams }: { searchParams: { status?: string } }) {
  const me = await requirePermission('money');
  const status = (searchParams.status ?? 'pending') as any;

  const [rows, counts, settings] = await Promise.all([
    listClaims(me, status), claimCounts(me), getSettings(),
  ]);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Transfers</h1>
      <p className="mb-4 max-w-2xl text-sm text-ink-mid">
        What members say they have sent. Open {settings.pay_method_label}, find the
        transaction, and confirm it here. <strong>Nothing counts until you do</strong> —
        a transaction ID on its own is just something someone typed.
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        {[['pending', 'Waiting'], ['confirmed', 'Confirmed'],
          ['rejected', 'Rejected'], ['all', 'All']].map(([key, label]) => (
          <a key={key} href={`/admin/claims?status=${key}`}>
            <Pill tone={status === key ? 'green' : 'grey'}>
              {label}{key !== 'all' && ` ${counts[key] ?? 0}`}
            </Pill>
          </a>
        ))}
      </div>

      {rows.length ? (
        <div className="space-y-3">
          {rows.map((c) => <ClaimRow key={c.id} claim={c} />)}
        </div>
      ) : (
        <Empty
          title={status === 'pending' ? 'Nothing waiting' : 'Nothing here'}
          body={status === 'pending'
            ? 'Transfers appear here when a member submits a transaction ID.'
            : 'Try another filter.'}
        />
      )}
    </>
  );
}
