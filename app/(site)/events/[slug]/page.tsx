import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentMember } from '@/lib/session';
import { eventBySlug } from '@/lib/queries/content';
import { Card, Pill } from '@/components/ui';
import RsvpBox from '@/components/money/rsvp';
import { myRsvp, eventHeadcount } from '@/lib/queries/tickets';

export const dynamic = 'force-dynamic';

export default async function EventPage({ params }: { params: { slug: string } }) {
  const me = await getCurrentMember();
  const e = await eventBySlug(me, params.slug);
  if (!e) notFound();

  const start = new Date(e.starts_at);
  const isPast = start < new Date();

  const canRsvp = !!me && ['active', 'inactive', 'alumni'].includes(me.status);
  const [existing, headcount] = await Promise.all([
    canRsvp ? myRsvp(me!.id, e.id) : Promise.resolve(null),
    eventHeadcount(e.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/events" className="mb-6 inline-block text-sm text-kantha">← All events</Link>

      {isPast && <div className="mb-4"><Pill tone="grey">This event has passed</Pill></div>}

      <h1 className="mb-2 font-display text-3xl font-bold sm:text-4xl">{e.title}</h1>
      {e.bengali_title && <p className="mb-4 font-display text-xl text-ink-mid">{e.bengali_title}</p>}

      <Card className="mb-6">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-ink-mid">When</dt>
            <dd className="text-[15px]">
              {start.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              <br />
              {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              {e.ends_at && ` – ${new Date(e.ends_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ink-mid">Where</dt>
            <dd className="text-[15px]">
              {e.location_name ?? 'To be confirmed'}
              {e.location_addr && <><br /><span className="text-ink-mid">{e.location_addr}</span></>}
            </dd>
          </div>
        </dl>
      </Card>

      {e.description && <p className="whitespace-pre-line text-[15px] leading-relaxed">{e.description}</p>}

      {!isPast && canRsvp && (
        <RsvpBox eventId={e.id} existing={existing} headcount={headcount} />
      )}

      {!isPast && !canRsvp && (
        <div className="mt-8 rounded-xl border-2 border-dashed border-stitch bg-white/60 p-5">
          <p className="mb-1 font-display font-bold">Sign in to RSVP</p>
          <p className="text-sm text-ink-mid">
            Members can tell us they are coming, and how many they are bringing, so we
            order the right amount of food.
          </p>
        </div>
      )}
    </div>
  );
}
