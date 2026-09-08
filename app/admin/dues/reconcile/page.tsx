import { requireAdmin } from '@/lib/session';
import { balances } from '@/lib/queries/dues';
import { funds } from '@/lib/queries/donations';
import { sql } from '@/lib/db';
import { Empty } from '@/components/ui';
import ReconcileTable from './table';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reconcile dues' };

export default async function Reconcile() {
  const me = await requireAdmin();
  const [rows, fundList, terms] = await Promise.all([
    balances(me, { onlyOwing: true }),
    funds(me),
    sql<any[]>`select id, name from terms order by year desc, season`,
  ]);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Reconcile</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-mid">
        Households with an outstanding balance. For each one: send a reminder, waive it,
        cover it from a fund, or leave it to carry forward. Carrying forward is the
        default and needs no action.
      </p>

      {rows.length ? (
        <ReconcileTable
          rows={rows}
          funds={fundList.map((f) => ({ id: f.id, name: f.name, balance: f.balance_cents }))}
          terms={terms.map((t) => ({ id: t.id, name: t.name }))}
        />
      ) : (
        <Empty title="Nothing outstanding" body="Every household is settled or in credit." />
      )}
    </>
  );
}
