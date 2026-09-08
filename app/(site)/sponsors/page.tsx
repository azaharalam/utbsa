import Link from 'next/link';
import { publicSponsors } from '@/lib/queries/sponsors';
import { TIERS } from '@/lib/sponsors';
import { Card, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Sponsors',
  description: 'The businesses, departments, and people who fund what UTBSA does.',
};

export default async function Sponsors() {
  const sponsors = await publicSponsors();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="mb-3 font-display text-3xl font-bold sm:text-4xl">Thank you</h1>
      <p className="mb-10 max-w-2xl text-ink-mid">
        Dues cover a part of what UTBSA does. The rest comes from these people —
        local businesses, university departments, faculty, and alumni who decided
        a few hundred students being less alone was worth paying for.
      </p>

      {sponsors.length ? (
        <div className="space-y-10">
          {TIERS.map((tier) => {
            const inTier = sponsors.filter((s) => s.tier.key === tier.key);
            if (!inTier.length) return null;

            return (
              <section key={tier.key}>
                <div className="mb-4 flex flex-wrap items-baseline gap-3">
                  <h2 className="font-display text-2xl font-bold"
                    style={{ color: tier.accent }}>
                    {tier.label}
                  </h2>
                  <span className="text-sm text-ink-mid">{tier.description}</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {inTier.map((s) => (
                    <Card key={s.id}>
                      <div className="-ml-5 border-l-[6px] pl-4"
                        style={{ borderColor: tier.accent }}>
                        <p className="font-display text-lg font-bold leading-tight">
                          {s.website ? (
                            <a href={s.website} target="_blank" rel="noopener noreferrer"
                              className="hover:text-kantha">{s.name}</a>
                          ) : s.name}
                        </p>
                        {s.blurb && <p className="mt-1 text-sm text-ink-mid">{s.blurb}</p>}
                        {s.gift_count > 1 && (
                          <p className="mt-2 text-xs text-ink-mid">
                            supporting us since{' '}
                            {new Date(s.first_gift).toLocaleDateString('en-US',
                              { month: 'long', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <Empty title="Nobody listed yet"
          body="Sponsors appear here once they have agreed to be named." />
      )}

      <hr className="stitch my-12 border-0" />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-display text-xl font-bold">Sponsoring UTBSA</h2>
          <p className="mb-3 text-sm text-ink-mid">
            We take gifts of any size, and gifts in kind — a restaurant catering
            Boishakh counts the same as a cheque.
          </p>
          <p className="mb-4 text-sm text-ink-mid">
            You can earmark a gift for something specific: a cultural programme,
            or the fund that quietly covers dues for students who cannot pay.
            That last one is $15 a semester per student.
          </p>
          <Link href="/contact" className="font-semibold text-kantha">Get in touch →</Link>
        </Card>

        <Card>
          <h2 className="mb-2 font-display text-xl font-bold">Being listed</h2>
          <p className="text-sm text-ink-mid">
            Nobody appears on this page without saying yes. Tell us when you give
            whether you would like to be named, and we will respect either answer.
            Plenty of our sponsors are not on this page at all.
          </p>
        </Card>
      </div>
    </div>
  );
}
