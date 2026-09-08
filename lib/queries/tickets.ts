import 'server-only';
import { sql } from '@/lib/db';
import { audit } from '@/lib/audit';
import { estimateFee } from '@/lib/money';
import type { Member } from '@/lib/types';
import type { TicketOrder, Rsvp } from '@/lib/money';

function assertAdmin(actor: Member) {
  if (actor.role !== 'admin' || actor.status !== 'active') throw new Error('Admins only.');
}

// ───────────────────────── RSVP ─────────────────────────

export async function myRsvp(memberId: string, eventId: string): Promise<Rsvp | null> {
  const rows = await sql<Rsvp[]>`
    select r.*, m.full_name as member_name
    from rsvps r join members m on m.id = r.member_id
    where r.member_id = ${memberId} and r.event_id = ${eventId}
  `;
  return rows[0] ?? null;
}

/** Upsert, so clicking twice edits rather than erroring. */
export async function setRsvp(
  memberId: string, eventId: string, guestCount: number, note: string | null
) {
  if (guestCount < 0 || guestCount > 20) throw new Error('Guest count looks wrong.');
  await sql`
    insert into rsvps (event_id, member_id, guest_count, note)
    values (${eventId}, ${memberId}, ${guestCount}, ${note})
    on conflict (event_id, member_id)
    do update set guest_count = excluded.guest_count, note = excluded.note
  `;
}

export async function cancelRsvp(memberId: string, eventId: string) {
  await sql`delete from rsvps where member_id = ${memberId} and event_id = ${eventId}`;
}

/** Headcount for the food order: members plus their guests. */
export async function eventHeadcount(eventId: string) {
  const [row] = await sql<{ people: string; guests: string; parties: string }[]>`
    select coalesce(count(*), 0)::text as parties,
           coalesce(sum(guest_count), 0)::text as guests,
           coalesce(count(*) + sum(guest_count), 0)::text as people
    from rsvps where event_id = ${eventId}
  `;
  return {
    parties: Number(row.parties),
    guests: Number(row.guests),
    people: Number(row.people),
  };
}

export async function eventRsvps(actor: Member, eventId: string): Promise<Rsvp[]> {
  assertAdmin(actor);
  return sql<Rsvp[]>`
    select r.*, m.full_name as member_name
    from rsvps r join members m on m.id = r.member_id
    where r.event_id = ${eventId}
    order by m.full_name
  `;
}

export async function checkIn(actor: Member, rsvpId: string) {
  assertAdmin(actor);
  await sql`update rsvps set checked_in_at = now() where id = ${rsvpId}`;
  await audit(actor.id, 'event.check_in', 'rsvp', rsvpId);
}

// ───────────────────────── tickets ─────────────────────────

/**
 * What a purchase costs.
 *
 * Members attend free. "Member" means status = active, REGARDLESS OF
 * BALANCE — someone who owes $30 still plays. That is deliberate: it
 * keeps the door volunteer from having to check anyone's balance, and
 * it avoids turning away the people we most want at these events.
 *
 * To tie free entry to being paid up instead, this is the one place
 * to change.
 */
export function priceFor(
  event: { member_price_cents: number; guest_price_cents: number; child_price_cents: number },
  isMember: boolean,
  qtyAdult: number,
  qtyChild: number
): number {
  const adultRate = isMember ? event.member_price_cents : event.guest_price_cents;
  return adultRate * qtyAdult + event.child_price_cents * qtyChild;
}

export async function eventOrders(actor: Member, eventId: string): Promise<TicketOrder[]> {
  assertAdmin(actor);
  return sql<TicketOrder[]>`
    select * from ticket_orders where event_id = ${eventId}
    order by created_at desc
  `;
}

export async function recordTicketSale(
  actor: Member,
  t: {
    eventId: string; memberId?: string | null; purchaserName: string;
    purchaserEmail?: string | null; qtyAdult: number; qtyChild: number;
    amountCents: number; method: string;
  }
) {
  assertAdmin(actor);

  const id = await sql.begin(async (tx) => {
    const [row] = await tx<{ id: string }[]>`
      insert into ticket_orders (event_id, member_id, purchaser_name, purchaser_email,
                                 qty_adult, qty_child, amount_cents, method, status, recorded_by)
      values (${t.eventId}, ${t.memberId ?? null}, ${t.purchaserName},
              ${t.purchaserEmail ?? null}, ${t.qtyAdult}, ${t.qtyChild},
              ${t.amountCents}, ${t.method}, 'paid', ${actor.id})
      returning id
    `;

    if (t.amountCents > 0) {
      const [ev] = await tx<{ term_id: string | null; title: string }[]>`
        select term_id, title from events where id = ${t.eventId}
      `;
      await tx`
        insert into ledger_entries (direction, category, amount_cents, term_id,
                                    source_type, source_id, note, recorded_by)
        values ('in', 'ticket', ${t.amountCents}, ${ev?.term_id ?? null},
                'ticket_order', ${row.id}, ${'Tickets — ' + (ev?.title ?? '')}, ${actor.id})
      `;
    }

    return row.id;
  });

  await audit(actor.id, 'ticket.sell', 'event', t.eventId, { amount_cents: t.amountCents });
  return id;
}

/** What cancelling would cost, shown before the admin confirms. */
export async function refundPreview(actor: Member, eventId: string) {
  assertAdmin(actor);
  const rows = await sql<{ method: string; n: string; total: string }[]>`
    select method, count(*)::text as n, sum(amount_cents)::text as total
    from ticket_orders
    where event_id = ${eventId} and status = 'paid'
    group by method
  `;

  let total = 0, orders = 0, cardTotal = 0;
  for (const r of rows) {
    total += Number(r.total);
    orders += Number(r.n);
    if (r.method === 'card') cardTotal += Number(r.total);
  }

  // Stripe keeps its fee on a refund. That loss is real and the
  // treasurer should see it before confirming, not discover it later.
  return { total_cents: total, order_count: orders, unrecoverable_fee_cents: estimateFee(cardTotal) };
}

/**
 * Cancel an event and refund every ticket.
 *
 * All or nothing, deliberately. Per-person refunds mean judgement calls,
 * partial states, and a ledger that stops balancing. No-shows get nothing.
 */
export async function cancelAndRefund(actor: Member, eventId: string, reason: string) {
  assertAdmin(actor);
  if (!reason.trim()) throw new Error('A reason is required.');

  const preview = await refundPreview(actor, eventId);

  await sql.begin(async (tx) => {
    const [ev] = await tx<{ term_id: string | null; title: string }[]>`
      select term_id, title from events where id = ${eventId}
    `;

    await tx`
      update ticket_orders set status = 'refunded', refunded_at = now()
      where event_id = ${eventId} and status = 'paid'
    `;

    if (preview.total_cents > 0) {
      await tx`
        insert into ledger_entries (direction, category, amount_cents, term_id,
                                    source_type, source_id, note, recorded_by)
        values ('out', 'refund', ${preview.total_cents}, ${ev?.term_id ?? null},
                'event', ${eventId},
                ${'Refunds — ' + (ev?.title ?? '') + ' — ' + reason.trim()}, ${actor.id})
      `;
    }

    if (preview.unrecoverable_fee_cents > 0) {
      await tx`
        insert into ledger_entries (direction, category, amount_cents, term_id,
                                    source_type, source_id, note, recorded_by)
        values ('out', 'processing_fee', ${preview.unrecoverable_fee_cents},
                ${ev?.term_id ?? null}, 'event', ${eventId},
                'Card fees not recovered on cancellation', ${actor.id})
      `;
    }

    await tx`update events set cancelled_at = now() where id = ${eventId}`;
  });

  await audit(actor.id, 'event.cancel_refund', 'event', eventId, {
    reason: reason.trim(),
    refunded_cents: preview.total_cents,
    orders: preview.order_count,
  });

  return preview;
}

// ───────────────────────── status change requests ─────────────────────────

export async function requestStatusChange(
  memberId: string, fromType: string, toType: string, reason: string | null
) {
  const [existing] = await sql<{ id: string }[]>`
    select id from status_change_requests
    where member_id = ${memberId} and decided_at is null
  `;
  if (existing) throw new Error('You already have a request waiting.');

  await sql`
    insert into status_change_requests (member_id, from_type, to_type, reason)
    values (${memberId}, ${fromType}, ${toType}, ${reason})
  `;
}

export async function pendingStatusRequests(actor: Member) {
  assertAdmin(actor);
  return sql<any[]>`
    select r.*, m.full_name as member_name, m.email as member_email
    from status_change_requests r
    join members m on m.id = r.member_id
    where r.decided_at is null
    order by r.requested_at
  `;
}

/**
 * Approve or decline.
 *
 * On approval the type changes from NOW, not retroactively. Someone who
 * graduates in December still owed Fall dues — backdating it would make
 * a graduating member's balance quietly vanish and stop the treasurer's
 * numbers reconciling.
 */
export async function decideStatusRequest(
  actor: Member, requestId: string, decision: 'approved' | 'declined', note: string | null
) {
  assertAdmin(actor);

  await sql.begin(async (tx) => {
    const [req] = await tx<{ member_id: string; to_type: string }[]>`
      update status_change_requests
      set decision = ${decision}, decided_by = ${actor.id}, decided_at = now(), note = ${note}
      where id = ${requestId} and decided_at is null
      returning member_id, to_type
    `;
    if (!req) throw new Error('That request has already been decided.');

    if (decision === 'approved') {
      await tx`update members set member_type = ${req.to_type} where id = ${req.member_id}`;
    }
  });

  await audit(actor.id, `status_request.${decision}`, 'request', requestId, { note });
}
