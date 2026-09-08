import { requirePermission } from '@/lib/session';
import { donations, funds } from '@/lib/queries/donations';
import { Card, Pill, Empty } from '@/components/ui';
import { Money } from '@/components/money/forms';
import DonationForm from './form';
import Gift from './gift';


export const dynamic = 'force-dynamic';
export const metadata = { title: 'Donations' };

export default async function Donations() {
  const me = await requirePermission('money');
  const [list, fundList] = await Promise.all([donations(me), funds(me)]);

  const unacked = list.filter((d) => !d.acknowledged_at);
  const cashTotal = list.filter((d) => !d.is_in_kind).reduce((s, d) => s + d.amount_cents, 0);
  const fundOpts = fundList.map((f) => ({
    id: f.id, name: f.name, is_restricted: f.is_restricted,
  }));

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Donations</h1>
      <p className="mb-5 max-w-2xl text-sm text-ink-mid">
        Every gift is recorded here by hand — someone offers money, you take their details
        and write it down. There is no public donation form; the contact page tells people
        to get in touch instead.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="font-display text-2xl font-bold text-nil"><Money cents={cashTotal} /></p>
          <p className="text-xs text-ink-mid">Cash received</p>
        </Card>
        <Card className={`p-4 ${unacked.length ? 'border-genda bg-[#FDF8EC]' : ''}`}>
          <p className="font-display text-2xl font-bold text-nil">{unacked.length}</p>
          <p className="text-xs text-ink-mid">Not yet thanked</p>
        </Card>
        <Card className="col-span-2 p-4 sm:col-span-1">
          <p className="font-display text-2xl font-bold text-nil">{list.length}</p>
          <p className="text-xs text-ink-mid">Gifts recorded</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr] lg:items-start">
        <DonationForm />

        <div>
          <h2 className="mb-1 font-display text-lg font-bold">Recent gifts</h2>
      <p className="mb-3 max-w-2xl text-sm text-ink-mid">
        Every gift sits in one fund. That is the whole relationship: a
        <strong> donation</strong> is money arriving, a <strong>fund</strong> is the
        pot it lands in. Most gifts belong in General, which can be spent on
        anything. Move one into a restricted fund when it was given for a
        particular purpose — that is what stops Boishakh money quietly paying for
        a cricket tournament.
      </p>
          {list.length ? (
            <div className="space-y-3">
              {list.slice(0, 30).map((d) => (
                <Gift key={d.id} gift={d} funds={fundOpts} />
              ))}
            </div>
          ) : (
            <Empty title="No donations yet"
              body="Record the first one with the form. Donors who are not thanked rarely give twice, so the counter above matters." />
          )}
        </div>
      </div>
    </>
  );
}
