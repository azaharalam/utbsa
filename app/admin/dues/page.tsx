import { requireAdmin } from '@/lib/session';
import { sql } from '@/lib/db';
import { balances, assessmentPreview } from '@/lib/queries/dues';
import { funds } from '@/lib/queries/donations';
import { Card, Pill } from '@/components/ui';
import { Money } from '@/components/money/forms';
import AssessPanel from './assess';
import PaymentForm from './payment';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dues' };

export default async function DuesAdmin() {
  const me = await requireAdmin();

  const terms = await sql<any[]>`select * from terms order by year desc, season`;
  const current = terms.find((t) => t.is_current) ?? terms[0];

  const [preview, rows, fundList] = await Promise.all([
    current ? assessmentPreview(me, current.id) : Promise.resolve(null),
    balances(me),
    funds(me),
  ]);

  const owing = rows.filter((r) => r.balance_cents > 0);
  const owedTotal = owing.reduce((s, r) => s + r.balance_cents, 0);
  const collected = rows.reduce((s, r) => s + r.paid_cents, 0);

  return (
    <>
      <h1 className="mb-5 font-display text-2xl font-bold sm:text-3xl">Dues</h1>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="font-display text-2xl font-bold text-nil"><Money cents={collected} /></p>
          <p className="text-xs text-ink-mid">Collected, all time</p>
        </Card>
        <Card className="p-4">
          <p className="font-display text-2xl font-bold text-nil"><Money cents={owedTotal} /></p>
          <p className="text-xs text-ink-mid">Outstanding</p>
        </Card>
        <Card className="col-span-2 p-4 sm:col-span-1">
          <p className="font-display text-2xl font-bold text-nil">{owing.length}</p>
          <p className="text-xs text-ink-mid">Households owing</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {current && preview && (
          <AssessPanel
            terms={terms.map((t) => ({ id: t.id, name: t.name, dues_cents: t.dues_cents,
                                       assessed: !!t.dues_assessed_at }))}
            current={{ ...preview, term_id: current.id }}
          />
        )}

        <PaymentForm
          households={rows.map((r) => ({ id: r.household_id, label: r.member_names,
                                         balance: r.balance_cents }))}
          terms={terms.map((t) => ({ id: t.id, name: t.name }))}
          funds={fundList.map((f) => ({ id: f.id, name: f.name, balance: f.balance_cents }))}
        />
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-bold">All households</h2>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-dashed border-stitch">
              <th className="p-3 text-left text-xs font-semibold text-ink-mid">Household</th>
              <th className="p-3 text-right text-xs font-semibold text-ink-mid">Charged</th>
              <th className="p-3 text-right text-xs font-semibold text-ink-mid">Paid</th>
              <th className="p-3 text-right text-xs font-semibold text-ink-mid">Adjusted</th>
              <th className="p-3 text-right text-xs font-semibold text-ink-mid">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.household_id} className="border-b border-muslin-deep last:border-0">
                <td className="p-3">{r.member_names}</td>
                <td className="p-3 text-right"><Money cents={r.charged_cents} /></td>
                <td className="p-3 text-right"><Money cents={r.paid_cents} /></td>
                <td className="p-3 text-right"><Money cents={r.adjusted_cents} /></td>
                <td className="p-3 text-right">
                  {r.balance_cents > 0
                    ? <Pill tone="gold"><Money cents={r.balance_cents} /></Pill>
                    : <Money cents={r.balance_cents} bold />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
