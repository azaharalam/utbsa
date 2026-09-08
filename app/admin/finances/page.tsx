import { requireAdmin } from '@/lib/session';
import { financialSummary } from '@/lib/queries/sponsors';
import { heldOffices } from '@/lib/permissions';
import { sql } from '@/lib/db';
import { Card, Pill } from '@/components/ui';
import { Money } from '@/components/money/forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Finances' };

const LABEL: Record<string, string> = {
  dues: 'Dues', donation: 'Donations', ticket: 'Ticket sales', other: 'Other income',
  refund: 'Refunds', processing_fee: 'Card fees', expense: 'Expenses',
  fund_disbursement: 'Paid from funds',
};

/**
 * A read-only summary for the whole e-board.
 *
 * requireAdmin() means any serving officer, not just those with the `money`
 * permission — a Media Officer can see this even though they cannot record a
 * payment. The board collectively answers for the money, so they should all
 * be able to see it. Ordinary members cannot, and it is never public.
 */
export default async function Finances({ searchParams }: { searchParams: { term?: string } }) {
  const me = await requireAdmin();
  const offices = await heldOffices(me.id);

  const [summary, terms] = await Promise.all([
    financialSummary(me, searchParams.term),
    sql<any[]>`select id, name, is_current from terms where name not like '%(demo)' order by year desc, season`,
  ]);

  const bar = (cents: number, of: number) =>
    of > 0 ? Math.max(2, Math.round((cents / of) * 100)) : 0;

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Finances</h1>
      <p className="mb-5 max-w-2xl text-sm text-ink-mid">
        Where the money came from and where it went. Visible to everyone on the
        e-board — you are {offices.map((o) => o.title).join(' and ') || 'an officer'} —
        and to nobody else. Members do not see this page.
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        <a href="/admin/finances"><Pill tone={searchParams.term ? 'grey' : 'green'}>All time</Pill></a>
        {terms.map((t) => (
          <a key={t.id} href={`/admin/finances?term=${t.id}`}>
            <Pill tone={searchParams.term === t.id ? 'green' : 'grey'}>{t.name}</Pill>
          </a>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="font-display text-2xl font-bold text-kantha"><Money cents={summary.totalIn} /></p>
          <p className="text-xs text-ink-mid">In</p>
        </Card>
        <Card className="p-4">
          <p className="font-display text-2xl font-bold text-alta"><Money cents={summary.totalOut} /></p>
          <p className="text-xs text-ink-mid">Out</p>
        </Card>
        <Card className={`p-4 ${summary.net < 0 ? 'border-alta' : ''}`}>
          <p className="font-display text-2xl font-bold text-nil"><Money cents={summary.net} /></p>
          <p className="text-xs text-ink-mid">{summary.net < 0 ? 'Shortfall' : 'Net'}</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Card>
          <h2 className="mb-3 font-display text-lg font-bold">Where it came from</h2>
          {summary.income.length ? (
            <ul className="space-y-3">
              {summary.income.map((r) => (
                <li key={r.category}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span>{LABEL[r.category] ?? r.category}</span>
                    <Money cents={r.cents} />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muslin-deep">
                    <div className="h-full rounded-full bg-kantha"
                      style={{ width: `${bar(r.cents, summary.totalIn)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-mid">Nothing recorded.</p>}
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-lg font-bold">Where it went</h2>
          {summary.spending.length ? (
            <ul className="space-y-3">
              {summary.spending.map((r) => (
                <li key={r.category}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span>{LABEL[r.category] ?? r.category}</span>
                    <Money cents={r.cents} />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muslin-deep">
                    <div className="h-full rounded-full bg-alta"
                      style={{ width: `${bar(r.cents, summary.totalOut)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-mid">Nothing spent yet.</p>}
        </Card>

        <Card>
          <h2 className="mb-1 font-display text-lg font-bold">What is sitting in funds</h2>
          <p className="mb-3 text-sm text-ink-mid">
            Restricted money can only be spent on its stated purpose.
          </p>
          <ul className="space-y-2">
            {summary.funds.map((f) => (
              <li key={f.name} className="flex items-center gap-2 text-sm">
                <span>{f.name}</span>
                {f.restricted && <Pill tone="gold">restricted</Pill>}
                <span className="ml-auto"><Money cents={f.cents} /></span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className={summary.outstanding_cents > 0 ? 'border-genda bg-[#FDF8EC]' : ''}>
          <h2 className="mb-1 font-display text-lg font-bold">Dues not yet paid</h2>
          <p className="font-display text-3xl font-bold text-nil">
            <Money cents={summary.outstanding_cents} />
          </p>
          <p className="text-sm text-ink-mid">
            across {summary.outstanding_members} member
            {summary.outstanding_members === 1 ? '' : 's'}
          </p>
          <p className="mt-3 text-sm text-ink-mid">
            This is money owed, not money lost. Balances carry forward and there is
            no penalty — some of it will arrive next semester, and some should
            probably be waived.
          </p>
        </Card>
      </div>
    </>
  );
}
