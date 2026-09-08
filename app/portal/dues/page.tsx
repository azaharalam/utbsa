import { requireApproved } from '@/lib/session';
import { memberLedger, memberBalance } from '@/lib/queries/dues';
import { getSettings } from '@/lib/queries/settings';
import { Card, Empty } from '@/components/ui';
import { Money } from '@/components/money/forms';
import ClaimForm from '@/components/money/claim-form';
import { myClaims } from '@/lib/queries/claims';
import type { DuesLine } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My dues' };

export default async function MyDues() {
  const me = await requireApproved();
  const settings = await getSettings();

  const [lines, balance, claims] = await Promise.all([
    memberLedger(me.id),
    memberBalance(me.id),
    myClaims(me.id),
  ]);

  const isStudent = me.member_type === 'student';

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">My dues</h1>
      <p className="mb-5 text-sm text-ink-mid">
        Dues are charged to students each semester. Spouses, faculty, alumni, and
        community members are not charged.
      </p>

      <Card className="mb-6">
        <p className="text-xs font-semibold text-ink-mid">Current balance</p>
        <p className="font-display text-4xl font-bold text-nil"><Money cents={balance} /></p>

        {!isStudent ? (
          <p className="mt-2 text-sm text-ink-mid">
            You are not charged dues. Everything here is free to you.
          </p>
        ) : balance > 0 ? (
          <p className="mt-2 text-sm text-ink-mid">
            Anything unpaid carries over to next semester. There is no penalty and no rush —
            pay whenever suits, and tell us if now is not a good time.
          </p>
        ) : balance < 0 ? (
          <p className="mt-2 text-sm text-ink-mid">You are in credit. This carries forward.</p>
        ) : (
          <p className="mt-2 text-sm text-ink-mid">All settled. Thank you.</p>
        )}

      </Card>

      {isStudent && (
        <div className="mb-6">
          <ClaimForm
            firstName={me.full_name.split(' ')[0]}
            balanceCents={balance}
            settings={{
              method: settings.pay_method_label,
              name: settings.pay_to_name,
              handle: settings.pay_to_handle,
              instructions: settings.pay_instructions,
            }}
            recent={claims.slice(0, 5)}
            via="portal"
          />
        </div>
      )}

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
              {(lines as DuesLine[]).map((l, i) => (
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
        <Empty title="Nothing yet"
          body={isStudent
            ? 'Charges appear here once dues are assessed for the semester.'
            : 'You are not charged dues, so there is nothing to show.'} />
      )}
    </>
  );
}
