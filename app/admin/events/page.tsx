import { requirePermission } from '@/lib/session';
import { allEvents } from '@/lib/queries/content';
import Link from 'next/link';
import { Card, Pill } from '@/components/ui';
import EventForm from './form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Events' };

export default async function EventsAdmin() {
  const me = await requirePermission('events');
  const events = await allEvents(me);

  return (
    <>
      <h1 className="mb-5 font-display text-2xl font-bold sm:text-3xl">Events</h1>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <EventForm />

        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold">All events</h2>
          {events.map((e) => {
            const past = new Date(e.starts_at) < new Date();
            return (
              <Card key={e.id} className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/events/${e.id}`}
                      className="font-display text-[15px] font-bold hover:text-kantha">
                      {e.title}
                    </Link>
                    <p className="text-xs text-ink-mid">
                      {new Date(e.starts_at).toLocaleString('en-US', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                      {e.location_name ? ` · ${e.location_name}` : ''}
                    </p>
                  </div>
                  <Pill tone={past ? 'grey' : 'green'}>{past ? 'past' : 'upcoming'}</Pill>
                  {e.is_potluck && <Pill tone="green">potluck</Pill>}
                  {!e.is_public && <Pill tone="gold">members only</Pill>}
                  <Link href={`/admin/events/${e.id}`}
                    className="text-sm font-semibold text-kantha">Open</Link>
                </div>
              </Card>
            );
          })}
          {!events.length && <p className="text-sm text-ink-mid">Nothing yet.</p>}
        </div>
      </div>
    </>
  );
}
