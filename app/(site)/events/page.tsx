import Link from 'next/link';
import { getCurrentMember } from '@/lib/session';
import { upcomingEvents, pastEvents } from '@/lib/queries/content';
import { Card, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Events' };

function DateBlock({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <div className="w-14 shrink-0 text-center">
      <p className="font-display text-xs font-bold uppercase text-alta">
        {d.toLocaleDateString('en-US', { month: 'short' })}
      </p>
      <p className="font-display text-3xl font-extrabold leading-none text-nil">{d.getDate()}</p>
      <p className="text-xs text-ink-mid">{d.toLocaleDateString('en-US', { weekday: 'short' })}</p>
    </div>
  );
}

export default async function Events() {
  const me = await getCurrentMember();
  const [upcoming, past] = await Promise.all([upcomingEvents(me), pastEvents(me)]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 font-display text-3xl font-bold sm:text-4xl">Events</h1>
      <p className="mb-8 text-ink-mid">Everything we have planned. Bring family — kids are always welcome.</p>

      {upcoming.length ? (
        <div className="space-y-4">
          {upcoming.map((e) => (
            <Card key={e.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex gap-4 sm:contents">
                  <DateBlock iso={e.starts_at} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-bold">
                      {e.title}
                      {e.bengali_title && <span className="ml-2 font-display text-base text-ink-mid">{e.bengali_title}</span>}
                    </h2>
                    <p className="text-sm text-ink-mid">
                      {[e.location_name, new Date(e.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })]
                        .filter(Boolean).join(' · ')}
                    </p>
                    {e.description && <p className="mt-1.5 line-clamp-2 text-sm text-ink-mid">{e.description}</p>}
                  </div>
                </div>
                <Link href={`/events/${e.slug}`} className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg bg-kantha px-4 text-sm font-semibold text-white">
                  Details
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Empty title="Nothing on the calendar" body="Check back soon, or follow the WhatsApp group for short-notice plans." />
      )}

      {!!past.length && (
        <>
          <hr className="stitch my-10 border-0" />
          <h2 className="mb-3 font-display text-xl font-bold">Already happened</h2>
          <ul className="space-y-1.5 text-sm text-ink-mid">
            {past.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.slug}`} className="hover:text-kantha">
                  {e.title} — {new Date(e.starts_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
