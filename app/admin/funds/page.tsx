import { requireAdmin } from '@/lib/session';
import { funds } from '@/lib/queries/donations';
import { Card, Pill } from '@/components/ui';
import { Money } from '@/components/money/forms';
import FundForm from './form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Funds' };

export default async function Funds() {
  const me = await requireAdmin();
  const list = await funds(me);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Funds</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-mid">
        Restricted funds can only be spent on their stated purpose. Keeping them
        separate from general money is what stops a gift earmarked for Boishakh
        quietly paying for something else.
      </p>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="space-y-3">
          {list.map((f) => (
            <Card key={f.id}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold">
                    {f.name}{' '}
                    {f.is_restricted && <Pill tone="gold">restricted</Pill>}
                  </p>
                  {f.description && <p className="text-sm text-ink-mid">{f.description}</p>}
                </div>
                <p className="font-display text-2xl font-bold text-nil">
                  <Money cents={f.balance_cents} />
                </p>
              </div>
            </Card>
          ))}
        </div>

        <FundForm />
      </div>
    </>
  );
}
