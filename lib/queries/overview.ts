import 'server-only';
import { sql } from '@/lib/db';
import { permissionsFor, type Permission } from '@/lib/permissions';
import type { Member } from '@/lib/types';

/**
 * Everything the admin overview needs, in one place and permission-aware.
 *
 * A Treasurer should not be told there are four members waiting for approval —
 * they cannot act on it, so it is noise. Each block is only computed if the
 * viewer could do something about it.
 */

export type Attention = {
  key: string;
  count: number;
  label: string;
  detail: string;
  href: string;
  urgent: boolean;
};

export async function overview(actor: Member) {
  const perms = await permissionsFor(actor.id);
  const has = (p: Permission) => perms.includes(p);

  const attention: Attention[] = [];

  if (has('members')) {
    const [r] = await sql<{ pending: string; requests: string; messages: string }[]>`
      select
        (select count(*)::text from members where status = 'pending') as pending,
        (select count(*)::text from status_change_requests where decided_at is null) as requests,
        (select count(*)::text from contact_messages where not handled) as messages
    `;
    if (Number(r.pending) > 0) attention.push({
      key: 'approvals', count: Number(r.pending),
      label: Number(r.pending) === 1 ? 'person waiting to join' : 'people waiting to join',
      detail: 'They confirmed their email and cannot see anything until someone approves them.',
      href: '/admin/approvals', urgent: true,
    });
    if (Number(r.messages) > 0) attention.push({
      key: 'messages', count: Number(r.messages),
      label: Number(r.messages) === 1 ? 'unanswered message' : 'unanswered messages',
      detail: 'Sent through the contact form.',
      href: '/admin/messages', urgent: false,
    });
    if (Number(r.requests) > 0) attention.push({
      key: 'requests', count: Number(r.requests),
      label: 'status change to decide',
      detail: 'Usually a student who has graduated.',
      href: '/admin/requests', urgent: false,
    });

    // Somebody landing soon with nobody to meet them is the one that cannot wait.
    const [a] = await sql<{ n: string }[]>`
      select count(*)::text n from arrival_requests
      where status = 'open' and arriving_on between current_date and current_date + 7
    `;
    if (Number(a.n) > 0) attention.push({
      key: 'arrivals', count: Number(a.n),
      label: Number(a.n) === 1 ? 'arrival this week with nobody assigned'
                               : 'arrivals this week with nobody assigned',
      detail: 'Post it in the WhatsApp group if the volunteer board is quiet.',
      href: '/admin/arrivals', urgent: true,
    });
  }

  if (has('money')) {
    const [m] = await sql<{ claims: string; unthanked: string }[]>`
      select
        (select count(*)::text from payment_claims where status = 'pending') as claims,
        (select count(*)::text from donations where acknowledged_at is null) as unthanked
    `;
    if (Number(m.claims) > 0) attention.push({
      key: 'claims', count: Number(m.claims),
      label: Number(m.claims) === 1 ? 'transfer to check' : 'transfers to check',
      detail: 'Nothing counts until you match it against the account.',
      href: '/admin/claims', urgent: true,
    });
    if (Number(m.unthanked) > 0) attention.push({
      key: 'thanks', count: Number(m.unthanked),
      label: Number(m.unthanked) === 1 ? 'donor not yet thanked' : 'donors not yet thanked',
      detail: 'Donors who are not thanked rarely give twice.',
      href: '/admin/donations', urgent: false,
    });
  }

  return { perms, attention };
}

export async function moneySnapshot(actor: Member) {
  const [row] = await sql<any[]>`
    select
      (select coalesce(sum(amount_cents), 0) from ledger_entries
       where direction = 'in')::int as collected,
      (select coalesce(sum(amount_cents), 0) from ledger_entries
       where direction = 'out')::int as spent,
      (select coalesce(sum(bal), 0) from (
         select (coalesce((select sum(amount_cents) from dues_charges where member_id = m.id), 0)
               - coalesce((select sum(amount_cents) from payments    where member_id = m.id), 0)
               - coalesce((select sum(amount_cents) from adjustments where member_id = m.id), 0)) bal
         from members m where m.status = 'active'
       ) x where bal > 0)::int as outstanding,
      (select count(*) from (
         select (coalesce((select sum(amount_cents) from dues_charges where member_id = m.id), 0)
               - coalesce((select sum(amount_cents) from payments    where member_id = m.id), 0)
               - coalesce((select sum(amount_cents) from adjustments where member_id = m.id), 0)) bal
         from members m where m.status = 'active' and m.member_type = 'student'
       ) y where bal <= 0)::int as paid_up,
      (select count(*) from members
       where status = 'active' and member_type = 'student')::int as students
  `;
  return row as {
    collected: number; spent: number; outstanding: number;
    paid_up: number; students: number;
  };
}

/** The next event, with the numbers an organiser needs at a glance. */
export async function nextEventSummary() {
  const [e] = await sql<any[]>`
    select id, slug, title, starts_at, location_name, is_potluck
    from events
    where is_published and cancelled_at is null and starts_at >= now()
    order by starts_at limit 1
  `;
  if (!e) return null;

  const [counts] = await sql<any[]>`
    select
      (select count(*) from rsvps where event_id = ${e.id})::int as households,
      (select coalesce(sum(adults), 0) from rsvps where event_id = ${e.id})::int as adults,
      (select coalesce(sum(children), 0) from rsvps where event_id = ${e.id})::int as children,
      (select count(*) from potluck_items
       where event_id = ${e.id} and claimed_by is null)::int as dishes_open,
      (select count(*) from potluck_items where event_id = ${e.id})::int as dishes_total
  `;
  return { ...e, ...counts, people: counts.adults + counts.children };
}

export async function recentActivity(limit = 6) {
  return sql<{ actor_name: string | null; actor_role: string | null;
               action: string; created_at: string; detail: any }[]>`
    select a.action, a.created_at::text, a.detail, a.actor_role,
           m.full_name as actor_name
    from audit_log a
    left join members m on m.id = a.actor_id
    order by a.created_at desc
    limit ${limit}
  `;
}

/** Things that will bite the next e-board if nobody notices. */
export async function healthWarnings(actor: Member) {
  const perms = await permissionsFor(actor.id);
  const out: { text: string; href?: string }[] = [];

  const [{ n: fullAccess }] = await sql<{ n: string }[]>`
    select count(*)::text n from officer_roles
    where ended_at is null and permission_set = 'full'
  `;
  if (Number(fullAccess) < 2 && perms.includes('roles')) {
    out.push({
      text: 'Only one office has full access. If that person loses their account, nobody can administer the site.',
      href: '/admin/offices',
    });
  }

  const [term] = await sql<any[]>`select * from terms where is_current`;
  if (term && !term.dues_assessed_at && perms.includes('money')) {
    out.push({
      text: `Dues have not been assessed for ${term.name}. Nobody has been charged yet.`,
      href: '/admin/dues',
    });
  }

  const [{ n: officers }] = await sql<{ n: string }[]>`
    select count(*)::text n from officer_roles o
    join settings s on true
    where o.session = s.current_session and o.ended_at is null and o.is_eboard
  `;
  if (Number(officers) === 0 && perms.includes('roles')) {
    out.push({ text: 'No e-board is listed for this session, so the public page is empty.',
               href: '/admin/offices' });
  }

  return out;
}
