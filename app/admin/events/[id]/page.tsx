import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/session';
import { sql } from '@/lib/db';
import { eventRsvps, eventHeadcount, eventOrders, refundPreview } from '@/lib/queries/tickets';
import { itemsFor } from '@/lib/queries/potluck';
import { teamsFor, playersFor } from '@/lib/queries/tournament';
import { Card, Pill, Empty } from '@/components/ui';
import { Money } from '@/components/money/forms';
import CheckInList from './checkin';
import TicketDesk from './tickets';
import CancelBox from './cancel';
import PotluckEditor from './potluck';
import Teams from './teams';

export const dynamic = 'force-dynamic';

export default async function EventDetail({ params }: { params: { id: string } }) {
  const me = await requirePermission('events');

  const [event] = await sql<any[]>`select * from events where id = ${params.id}`;
  if (!event) notFound();

  const [rsvps, headcount, orders, refund, potluck, teams, players, memberList] =
    await Promise.all([
      eventRsvps(event.id),
      eventHeadcount(event.id),
      eventOrders(me, event.id),
      refundPreview(me, event.id),
      event.is_potluck ? itemsFor(event.id) : Promise.resolve([]),
      event.is_tournament ? teamsFor(event.id) : Promise.resolve([]),
      event.is_tournament ? playersFor(event.id) : Promise.resolve([]),
      event.is_tournament
        ? sql<{ id: string; full_name: string }[]>`
            select id, full_name from members
            where status = 'active' order by full_name`
        : Promise.resolve([]),
    ]);

  const teamName = (id: string | null) =>
    id ? (teams.find((t) => t.id === id)?.name ?? null) : null;

  const paid = orders.filter((o) => o.status === 'paid');
  const ticketRevenue = paid.reduce((s, o) => s + o.amount_cents, 0);
  const ticketPeople = paid.reduce((s, o) => s + o.qty_adult + o.qty_child, 0);
  const isPast = new Date(event.starts_at) < new Date();

  return (
    <>
      <Link href="/admin/events" className="mb-4 inline-block text-sm text-kantha">
        ← All events
      </Link>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{event.title}</h1>
        {event.is_potluck && <Pill tone="green">potluck</Pill>}
        {event.is_tournament && <Pill tone="green">tournament</Pill>}
        {event.cancelled_at && <Pill tone="red">cancelled</Pill>}
        {!event.is_public && <Pill tone="gold">members only</Pill>}
      </div>
      <p className="mb-6 text-sm text-ink-mid">
        {new Date(event.starts_at).toLocaleString('en-US', {
          weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
        })}
        {event.location_name && ` · ${event.location_name}`}
      </p>

      {/* The number that actually matters: how much food to order. */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="font-display text-3xl font-bold leading-tight text-nil">
            {headcount.people + ticketPeople}
          </p>
          <p className="text-xs text-ink-mid">People expected</p>
        </Card>
        <Card className="p-4">
          <p className="font-display text-2xl font-bold leading-tight text-nil">{headcount.households}</p>
          <p className="text-xs text-ink-mid">Households coming</p>
        </Card>
        <Card className="p-4">
          <p className="font-display text-2xl font-bold leading-tight text-nil">{headcount.children}</p>
          <p className="text-xs text-ink-mid">Children (3+)</p>
        </Card>
        <Card className="p-4">
          <p className="font-display text-2xl font-bold leading-tight text-nil">
            <Money cents={ticketRevenue} />
          </p>
          <p className="text-xs text-ink-mid">Tickets sold</p>
        </Card>
      </div>

      {event.is_potluck && (
        <div className="mb-6">
          <PotluckEditor eventId={event.id} items={potluck}
            expected={headcount.people || 30} />
        </div>
      )}

      {event.is_tournament && (
        <div className="mb-6">
          <Teams
            eventId={event.id}
            teams={teams}
            players={players}
            publishedAt={event.teams_published_at}
            championId={event.champion_team_id}
            runnerUpId={event.runner_up_team_id}
            contributionCents={event.player_contribution_cents ?? 0}
            costBreakdown={event.cost_breakdown}
            members={memberList}
          />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div>
          <h2 className="mb-1 font-display text-lg font-bold">Who is coming</h2>
          <p className="mb-3 text-sm text-ink-mid">
            Tick people off as they arrive. Notes are what members told you when
            they RSVP&apos;d — dietary needs, arriving late.
          </p>
          {rsvps.length ? (
            <CheckInList eventId={event.id} rsvps={rsvps} />
          ) : (
            <Empty title="Nobody has RSVP'd yet"
              body="Members RSVP from the event page on the public site." />
          )}
        </div>

        <div className="space-y-5">
          {event.is_ticketed && !event.cancelled_at && (
            <TicketDesk eventId={event.id} orders={orders}
              guestPrice={event.guest_price_cents} childPrice={event.child_price_cents} />
          )}

          {!event.cancelled_at && !isPast && (
            <CancelBox eventId={event.id} refund={refund} />
          )}
        </div>
      </div>
    </>
  );
}
