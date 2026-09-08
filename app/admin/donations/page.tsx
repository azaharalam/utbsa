import { requireAdmin } from '@/lib/session';
import { donations, funds } from '@/lib/queries/donations';
import { Card, Pill, Empty } from '@/components/ui';
import { Money } from '@/components/money/forms';
import DonationForm from './form';
import AckButton from './ack';
import FundPicker from './fund-picker';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Donations' };

export default async function Donations() {
  const me = await requireAdmin();
  const [list, fundList] = await Promise.all([donations(me), funds(me)]);

  const unacked = list.filter((d) => !d.acknowledged_at);
  const cashTotal = list.filter((d) => !d.is_in_kind).reduce((s, d) => s + d.amount_cents, 0);
  const fundOpts = fundList.map((f) => ({ id: f.id, name: f.name }));

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
          <h2 className="mb-3 font-display text-lg font-bold">Recent gifts</h2>
          {list.length ? (
            <div className="space-y-3">
              {list.slice(0, 30).map((d) => (
                <Card key={d.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[15px] font-bold">{d.donor_name}</p>
                      <p className="text-xs text-ink-mid">
                        {new Date(d.received_on).toLocaleDateString('en-US',
                          { day: 'numeric', month: 'short', year: 'numeric' })}
                        {d.is_in_kind ? ' · goods, not cash' : ` · ${d.method}`}
                      </p>
                      {d.in_kind_description && (
                        <p className="text-xs text-ink-mid">{d.in_kind_description}</p>
                      )}
                    </div>
                    <span className="font-display text-lg font-bold">
                      <Money cents={d.amount_cents} />
                    </span>
                    <FundPicker donationId={d.id} current={d.fund_id} funds={fundOpts} />
                    {d.acknowledged_at
                      ? <Pill tone="green">thanked</Pill>
                      : <AckButton id={d.id} />}
                  </div>
                </Card>
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
