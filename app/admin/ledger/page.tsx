import { requireAdmin } from '@/lib/session';
import { entries, totals } from '@/lib/queries/ledger';
import { funds } from '@/lib/queries/donations';
import { sql } from '@/lib/db';
import { Card, Pill, Empty } from '@/components/ui';
import { Money } from '@/components/money/forms';
import ExpenseForm from './expense';
import LedgerExport from './export';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ledger' };

const labels: Record<string, string> = {
  dues: 'Dues', donation: 'Donations', ticket: 'Tickets', other: 'Other',
  refund: 'Refunds', processing_fee: 'Card fees',
  expense: 'Expenses', fund_disbursement: 'From funds',
};

// Expense categories are stored as their display name, so anything not in
// the map above shows as-is.
const label = (c: string) => labels[c] ?? c;

export default async function Ledger({ searchParams }: { searchParams: { term?: string } }) {
  const me = await requireAdmin();

  const [rows, sums, fundList, terms] = await Promise.all([
    entries(me, { termId: searchParams.term }),
    totals(me, searchParams.term),
    funds(me),
    sql<any[]>`select id, name from terms order by year desc, season`,
  ]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Ledger</h1>
        <LedgerExport rows={rows} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <a href="/admin/ledger"><Pill tone={searchParams.term ? 'grey' : 'green'}>All time</Pill></a>
        {terms.map((t) => (
          <a key={t.id} href={`/admin/ledger?term=${t.id}`}>
            <Pill tone={searchParams.term === t.id ? 'green' : 'grey'}>{t.name}</Pill>
          </a>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="font-display text-xl font-bold text-kantha"><Money cents={sums.inTotal} /></p>
          <p className="text-xs text-ink-mid">In</p>
        </Card>
        <Card className="p-4">
          <p className="font-display text-xl font-bold text-alta"><Money cents={sums.outTotal} /></p>
          <p className="text-xs text-ink-mid">Out</p>
        </Card>
        <Card className="p-4">
          <p className="font-display text-xl font-bold text-nil"><Money cents={sums.net} /></p>
          <p className="text-xs text-ink-mid">Net</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div>
          <h2 className="mb-3 font-display text-lg font-bold">Transactions</h2>
          {rows.length ? (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-dashed border-stitch">
                    <th className="p-3 text-left text-xs font-semibold text-ink-mid">Date</th>
                    <th className="p-3 text-left text-xs font-semibold text-ink-mid">Category</th>
                    <th className="p-3 text-left text-xs font-semibold text-ink-mid">Note</th>
                    <th className="p-3 text-right text-xs font-semibold text-ink-mid">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id} className="border-b border-muslin-deep last:border-0">
                      <td className="whitespace-nowrap p-3 text-ink-mid">
                        {new Date(e.occurred_on).toLocaleDateString('en-US',
                          { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="p-3">
                        <Pill tone={e.direction === 'in' ? 'green' : 'red'}>
                          {label(e.category)}
                        </Pill>
                        {e.fund_name && <span className="ml-2 text-xs text-ink-mid">{e.fund_name}</span>}
                      </td>
                      <td className="p-3 text-ink-mid">{e.note}</td>
                      <td className="p-3 text-right">
                        <span className={e.direction === 'in' ? 'text-kantha' : 'text-alta'}>
                          {e.direction === 'in' ? '+' : '−'}
                          <Money cents={e.amount_cents} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            <Empty title="Nothing recorded yet"
              body="Payments, donations, and ticket sales appear here automatically." />
          )}
        </div>

        <ExpenseForm funds={fundList.map((f) => ({ id: f.id, name: f.name }))} />
      </div>
    </>
  );
}
