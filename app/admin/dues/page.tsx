import { requireAdmin } from '@/lib/session';
import { sql } from '@/lib/db';
import { balances, assessmentPreview } from '@/lib/queries/dues';
import { funds } from '@/lib/queries/donations';
import { Card } from '@/components/ui';
import { Money } from '@/components/money/forms';
import AssessPanel from './assess';
import PaymentForm from './payment';
import DuesTable from './table';

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

  const memberOpts = rows.map((r) => ({
    id: r.member_id, name: r.full_name, balance: r.balance_cents,
  }));
  const fundOpts = fundList.map((f) => ({
    id: f.id, name: f.name, balance: f.balance_cents,
  }));

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
          <p className="text-xs text-ink-mid">Members owing</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {current && preview && (
          <AssessPanel
            terms={terms.map((t) => ({ id: t.id, name: t.name, dues_cents: t.dues_cents }))}
            current={{ ...preview, term_id: current.id }}
          />
        )}
        <PaymentForm members={memberOpts} funds={fundOpts} />
      </div>

      <h2 className="mb-1 mt-8 font-display text-lg font-bold">Everyone</h2>
      <p className="mb-3 text-sm text-ink-mid">
        Anyone with a balance gets an Action button — remind them, waive it, or cover it
        from a fund. Nothing carries a penalty; unpaid amounts simply roll into next semester.
      </p>
      <DuesTable rows={rows} funds={fundOpts} />
    </>
  );
}
