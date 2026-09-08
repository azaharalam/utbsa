import { requireApproved } from '@/lib/session';
import { memberLedger, householdBalance } from '@/lib/queries/dues';
import { getSettings } from '@/lib/queries/settings';
import { Card, Notice, Empty } from '@/components/ui';
import { Money } from '@/components/money/forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My dues' };

export default async function MyDues() {
  const me = await requireApproved();
  const settings = await getSettings();

  const [lines, balance] = await Promise.all([
    memberLedger(me.id),
    me.household_id ? householdBalance(me.household_id) : Promise.resolve(0),
  ]);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">My dues</h1>
      <p className="mb-5 text-sm text-ink-mid">
        Dues are $15 a semester for students. Spouses, faculty, and community members
        are not charged.
      </p>

      <Card className="mb-6">
        <p className="text-xs font-semibold text-ink-mid">Current balance</p>
        <p className="font-display text-4xl font-bold text-nil">
          <Money cents={balance} />
        </p>
        {balance > 0 ? (
          <p className="mt-2 text-sm text-ink-mid">
            Anything unpaid carries over to next semester. There is no penalty and no rush —
            pay whenever suits, and tell us if now is not a good time.
          </p>
        ) : balance < 0 ? (
          <p className="mt-2 text-sm text-ink-mid">You are in credit. This carries forward.</p>
        ) : (
          <p className="mt-2 text-sm text-ink-mid">All settled. Thank you.</p>
        )}

        {balance > 0 && !settings.payments_enabled && (
          <div className="mt-4">
            <Notice tone="info">
              Online payment is not switched on. Hand cash to the treasurer at any event,
              or ask the e-board how to transfer.
            </Notice>
          </div>
        )}
      </Card>

      <h2 className="mb-3 font-display text-lg font-bold">History</h2>
      {lines.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-dashed border-stitch">
                <th className="p-3 text-left text-xs font-semibold text-ink-mid">Date</th>
                <th className="p-3 text-left text-xs font-semibold text-ink-mid">What</th>
                <th className="p-3 text-right text-xs font-semibold text-ink-mid">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-b border-muslin-deep last:border-0">
                  <td className="whitespace-nowrap p-3 text-ink-mid">
                    {new Date(l.occurred_on).toLocaleDateString('en-US',
                      { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-3 capitalize">{l.description}</td>
                  <td className="p-3 text-right"><Money cents={l.amount_cents} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Empty title="Nothing yet" body="Charges appear here once dues are assessed for the semester." />
      )}
    </>
  );
}
