import Link from 'next/link';
import { requireApproved } from '@/lib/session';
import { upcomingEvents, pastEvents } from '@/lib/queries/content';
import { myRsvp, eventHeadcount } from '@/lib/queries/tickets';
import { potluckSummary } from '@/lib/queries/potluck';
import { Card, Pill, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Events' };

function DateBlock({ iso, muted }: { iso: string; muted?: boolean }) {
  const d = new Date(iso);
  return (
    <div className={`w-14 shrink-0 text-center ${muted ? 'opacity-60' : ''}`}>
      <p className="font-display text-xs font-bold uppercase text-alta">
        {d.toLocaleDateString('en-US', { month: 'short' })}
      </p>
      <p className="font-display text-3xl font-extrabold leading-none text-nil">{d.getDate()}</p>
      <p className="text-xs text-ink-mid">{d.toLocaleDateString('en-US', { weekday: 'short' })}</p>
    </div>
  );
}

export default async function PortalEvents() {
  const me = await requireApproved();
  const [upcoming, past] = await Promise.all([upcomingEvents(me), pastEvents(me, 20)]);

  // Only load the extra detail for events still to come.
  const detail = await Promise.all(upcoming.map(async (e) => ({
    rsvp: await myRsvp(me.id, e.id),
    headcount: await eventHeadcount(e.id),
    potluck: e.is_potluck ? await potluckSummary(e.id) : null,
  })));

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Events</h1>
      <p className="mb-6 text-sm text-ink-mid">
        Everything coming up, and what we have already done.
      </p>

      <h2 className="mb-3 font-display text-lg font-bold">Coming up</h2>
      {upcoming.length ? (
        <div className="mb-10 space-y-3">
          {upcoming.map((e, i) => {
            const d = detail[i];
            return (
              <Card key={e.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex gap-4 sm:contents">
                    <DateBlock iso={e.starts_at} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Link href={`/events/${e.slug}`}
                          className="font-display text-lg font-bold hover:text-kantha">
                          {e.title}
                        </Link>
                        {e.is_potluck && <Pill tone="green">potluck</Pill>}
                      </div>
                      <p className="text-sm text-ink-mid">
                        {[e.location_name,
                          new Date(e.starts_at).toLocaleTimeString('en-US',
                            { hour: 'numeric', minute: '2-digit' })].filter(Boolean).join(' · ')}
                      </p>

                      <p className="mt-2 text-xs text-ink-mid">
                        {d.headcount.people} coming from {d.headcount.households}{' '}
                        {d.headcount.households === 1 ? 'household' : 'households'}
                        {d.potluck && ` · ${d.potluck.open} of ${d.potluck.total} dishes still needed`}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {d.rsvp ? (
                      <div className="text-right">
                        <Pill tone="green">
                          you&apos;re going
                          {d.rsvp.adults - 1 + d.rsvp.children > 0 &&
                            ` +${d.rsvp.adults - 1 + d.rsvp.children}`}
                        </Pill>
                        <Link href={`/events/${e.slug}`}
                          className="mt-2 block text-xs text-ink-mid hover:text-kantha">
                          change
                        </Link>
                      </div>
                    ) : (
                      <Link href={`/events/${e.slug}`}
                        className="inline-flex min-h-[40px] items-center rounded-lg bg-kantha px-4 text-sm font-semibold text-white">
                        RSVP
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="mb-10">
          <Empty title="Nothing scheduled"
            body="When the e-board plans something, it appears here and you will get an email." />
        </div>
      )}

      <h2 className="mb-3 font-display text-lg font-bold">Already happened</h2>
      {past.length ? (
        <div className="space-y-2">
          {past.map((e) => (
            <Card key={e.id} className="p-3">
              <div className="flex items-center gap-4">
                <DateBlock iso={e.starts_at} muted />
                <div className="min-w-0 flex-1">
                  <Link href={`/events/${e.slug}`}
                    className="font-display text-[15px] font-bold hover:text-kantha">
                    {e.title}
                  </Link>
                  <p className="text-xs text-ink-mid">
                    {e.location_name} ·{' '}
                    {new Date(e.starts_at).toLocaleDateString('en-US',
                      { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-mid">Nothing yet.</p>
      )}
    </>
  );
}
