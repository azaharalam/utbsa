import 'server-only';
import { sql } from '@/lib/db';
import { audit } from '@/lib/audit';
import { can } from '@/lib/permissions';
import { sendMail } from '@/lib/mail';
import type { Member } from '@/lib/types';

/**
 * ─────────────────────────────────────────────────────────────
 * Arrival requests are the most sensitive data in the app.
 *
 * They come from people who are not members yet, and they say: this named
 * person, on this flight, lands at this airport at this time, alone, with
 * luggage, and does not know the city.
 *
 * So: never public, never in the directory, and only visible to the
 * volunteer who claimed it plus officers with the `members` permission.
 * The public board shows that a request exists — a date and a first name —
 * and nothing that would let a stranger meet the wrong person.
 * ─────────────────────────────────────────────────────────────
 */

async function assertMembers(actor: Member) {
  if (actor.status !== 'active' || !(await can(actor.id, 'members'))) {
    throw new Error('You do not have access to this.');
  }
}

function isActive(m: Member) {
  return ['active', 'inactive', 'alumni'].includes(m.status);
}

export type ArrivalRequest = {
  id: string; full_name: string; email: string; phone: string | null;
  arriving_on: string; arriving_at: string | null; airport: string | null;
  flight_no: string | null; people_count: number; luggage_note: string | null;
  needs_pickup: boolean; needs_stay: boolean; needs_shopping: boolean;
  program: string | null; department: string | null; note: string | null;
  status: string; claimed_by: string | null; claimed_by_name?: string | null;
  claimed_at: string | null; created_at: string;
};

/** What every member sees: enough to volunteer, nothing identifying. */
export type ArrivalSummary = {
  id: string; first_name: string; arriving_on: string; airport: string | null;
  people_count: number; needs_pickup: boolean; needs_stay: boolean;
  needs_shopping: boolean; program: string | null; status: string;
  claimed_by: string | null; claimed_by_name: string | null; mine: boolean;
};

export async function submitArrival(r: {
  fullName: string; email: string; phone?: string | null;
  arrivingOn: string; arrivingAt?: string | null; airport?: string | null;
  flightNo?: string | null; peopleCount?: number; luggageNote?: string | null;
  needsPickup: boolean; needsStay: boolean; needsShopping: boolean;
  program?: string | null; department?: string | null; note?: string | null;
}) {
  if (!r.fullName.trim()) throw new Error('Please tell us your name.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) throw new Error('That email does not look right.');
  if (!r.needsPickup && !r.needsStay && !r.needsShopping) {
    throw new Error('Tell us at least one thing we can help with.');
  }

  const [row] = await sql<{ id: string }[]>`
    insert into arrival_requests (
      full_name, email, phone, arriving_on, arriving_at, airport, flight_no,
      people_count, luggage_note, needs_pickup, needs_stay, needs_shopping,
      program, department, note
    ) values (
      ${r.fullName.trim()}, ${r.email.trim().toLowerCase()}, ${r.phone ?? null},
      ${r.arrivingOn}, ${r.arrivingAt ?? null}, ${r.airport ?? 'DTW'},
      ${r.flightNo ?? null}, ${r.peopleCount ?? 1}, ${r.luggageNote ?? null},
      ${r.needsPickup}, ${r.needsStay}, ${r.needsShopping},
      ${r.program ?? null}, ${r.department ?? null}, ${r.note ?? null}
    ) returning id
  `;
  return row.id;
}

/** The volunteer board. First names and dates only. */
export async function arrivalBoard(viewer: Member): Promise<ArrivalSummary[]> {
  if (!isActive(viewer)) return [];
  const rows = await sql<any[]>`
    select a.id, split_part(a.full_name, ' ', 1) as first_name,
           a.arriving_on::text, a.airport, a.people_count,
           a.needs_pickup, a.needs_stay, a.needs_shopping, a.program,
           a.status, a.claimed_by, m.full_name as claimed_by_name
    from arrival_requests a
    left join members m on m.id = a.claimed_by
    where a.status in ('open','claimed')
      and a.arriving_on >= current_date - interval '2 days'
    order by a.arriving_on
  `;
  return rows.map((r) => ({ ...r, mine: r.claimed_by === viewer.id }));
}

/**
 * The full record, including flight and phone.
 * Only the volunteer who claimed it, or an officer.
 */
export async function arrivalDetail(
  viewer: Member, id: string
): Promise<ArrivalRequest | null> {
  const rows = await sql<ArrivalRequest[]>`
    select a.*, a.arriving_on::text, a.arriving_at::text, m.full_name as claimed_by_name
    from arrival_requests a
    left join members m on m.id = a.claimed_by
    where a.id = ${id}
  `;
  const r = rows[0];
  if (!r) return null;

  const isOfficer = await can(viewer.id, 'members');
  if (r.claimed_by !== viewer.id && !isOfficer) return null;
  return r;
}

export async function claimArrival(viewer: Member, id: string) {
  if (!isActive(viewer)) throw new Error('Only members can volunteer.');
  const [row] = await sql<{ id: string }[]>`
    update arrival_requests
    set status = 'claimed', claimed_by = ${viewer.id}, claimed_at = now()
    where id = ${id} and status = 'open'
    returning id
  `;
  if (!row) throw new Error('Someone else has already taken this one.');
  await audit(viewer.id, 'arrival.claim', 'arrival', id);
}

export async function releaseArrival(viewer: Member, id: string) {
  const [row] = await sql<{ id: string }[]>`
    update arrival_requests
    set status = 'open', claimed_by = null, claimed_at = null
    where id = ${id} and claimed_by = ${viewer.id}
    returning id
  `;
  if (!row) throw new Error('That is not yours to release.');
  await audit(viewer.id, 'arrival.release', 'arrival', id);
}

export async function closeArrival(viewer: Member, id: string, note: string, cancelled = false) {
  const detail = await arrivalDetail(viewer, id);
  if (!detail) throw new Error('You cannot close this one.');
  await sql`
    update arrival_requests
    set status = ${cancelled ? 'cancelled' : 'done'}, closed_note = ${note || null}
    where id = ${id}
  `;
  await audit(viewer.id, cancelled ? 'arrival.cancel' : 'arrival.done', 'arrival', id);
}

/**
 * An officer assigning somebody to meet an arrival.
 *
 * Worth being deliberate about: assigning hands that member the flight
 * number and phone number of someone who is not a member yet. Only do it to
 * people who have agreed, which is why the volunteer is emailed rather than
 * simply finding out later.
 */
export async function assignArrival(actor: Member, arrivalId: string, memberId: string) {
  await assertMembers(actor);

  const [volunteer] = await sql<{ id: string; full_name: string; email: string }[]>`
    select id, full_name, email from members
    where id = ${memberId} and status in ('active','inactive','alumni')
  `;
  if (!volunteer) throw new Error('That member was not found.');

  const [arrival] = await sql<any[]>`
    update arrival_requests
    set status = 'claimed', claimed_by = ${memberId}, claimed_at = now()
    where id = ${arrivalId} and status in ('open','claimed')
    returning *
  `;
  if (!arrival) throw new Error('That request is already closed.');

  await audit(actor.id, 'arrival.assign', 'arrival', arrivalId,
              { member_id: memberId });

  await sendMail({
    to: volunteer.email,
    subject: `Can you meet ${arrival.full_name.split(' ')[0]} at the airport?`,
    text: `Assalamu alaikum ${volunteer.full_name.split(' ')[0]},\n\n`
        + `${actor.full_name} has put your name down to meet someone arriving in Toledo.\n\n`
        + `${arrival.full_name} lands at ${arrival.airport} on `
        + `${new Date(arrival.arriving_on).toLocaleDateString('en-US',
             { weekday: 'long', day: 'numeric', month: 'long' })}`
        + `${arrival.arriving_at ? ` at ${String(arrival.arriving_at).slice(0, 5)}` : ''}.\n\n`
        + `Their flight details and phone number are on the arrivals page in your `
        + `portal. If you cannot make it, release it there so somebody else picks `
        + `it up — please do not leave it.\n\n— UTBSA`,
  });
}

/** Take the volunteer off, without closing the request. */
export async function unassignArrival(actor: Member, arrivalId: string) {
  await assertMembers(actor);
  const [row] = await sql<{ id: string }[]>`
    update arrival_requests
    set status = 'open', claimed_by = null, claimed_at = null
    where id = ${arrivalId} and status = 'claimed'
    returning id
  `;
  if (!row) throw new Error('Nobody is assigned to that one.');
  await audit(actor.id, 'arrival.unassign', 'arrival', arrivalId);
}

/** Members who could be asked — anyone active, nearest name first. */
export async function volunteerCandidates(actor: Member) {
  await assertMembers(actor);
  return sql<{ id: string; full_name: string; taken: number }[]>`
    select m.id, m.full_name,
           (select count(*) from arrival_requests a
            where a.claimed_by = m.id and a.status in ('claimed','done'))::int as taken
    from members m
    where m.status = 'active'
    order by m.full_name
  `;
}

export async function allArrivals(actor: Member, showClosed = false) {
  await assertMembers(actor);
  return sql<ArrivalRequest[]>`
    select a.*, a.arriving_on::text, a.arriving_at::text, m.full_name as claimed_by_name
    from arrival_requests a
    left join members m on m.id = a.claimed_by
    where (${showClosed} or a.status in ('open','claimed'))
    order by a.arriving_on desc
    limit 200
  `;
}

// ───────────────────────── giveaway ─────────────────────────

export type GiveawayItem = {
  id: string; posted_by: string; poster_name: string; title: string;
  description: string | null; category: string; condition: string | null;
  price_cents: number; status: string; claimed_by: string | null;
  claimed_by_name: string | null; created_at: string;
};

export async function giveawayItems(viewer: Member, showGone = false): Promise<GiveawayItem[]> {
  if (!isActive(viewer)) return [];
  return sql<GiveawayItem[]>`
    select g.*, p.full_name as poster_name, c.full_name as claimed_by_name
    from giveaway_items g
    join members p on p.id = g.posted_by
    left join members c on c.id = g.claimed_by
    where (${showGone} or g.status <> 'gone')
    order by g.created_at desc
  `;
}

export async function postGiveaway(viewer: Member, g: {
  title: string; description?: string | null; category: string;
  condition?: string | null; priceCents?: number;
}) {
  if (!isActive(viewer)) throw new Error('Only members can post.');
  if (!g.title.trim()) throw new Error('Give it a name.');
  const [row] = await sql<{ id: string }[]>`
    insert into giveaway_items (posted_by, title, description, category, condition, price_cents)
    values (${viewer.id}, ${g.title.trim()}, ${g.description ?? null},
            ${g.category}, ${g.condition ?? 'good'}, ${g.priceCents ?? 0})
    returning id
  `;
  return row.id;
}

export async function claimGiveaway(viewer: Member, id: string) {
  if (!isActive(viewer)) throw new Error('Only members can claim.');
  const [row] = await sql<{ id: string }[]>`
    update giveaway_items
    set status = 'claimed', claimed_by = ${viewer.id}, claimed_at = now()
    where id = ${id} and status = 'available'
    returning id
  `;
  if (!row) throw new Error('Someone got there first.');
}

export async function setGiveawayStatus(viewer: Member, id: string, status: string) {
  const [row] = await sql<{ id: string }[]>`
    update giveaway_items set status = ${status}
    where id = ${id} and posted_by = ${viewer.id}
    returning id
  `;
  if (!row) throw new Error('That is not your listing.');
}

// ───────────────────────── housing ─────────────────────────

export type HousingPost = {
  id: string; posted_by: string; poster_name: string; poster_email: string | null;
  kind: string; title: string; area: string | null; rent_cents: number | null;
  available_from: string | null; description: string | null;
  status: string; created_at: string;
};

export async function housingPosts(viewer: Member): Promise<HousingPost[]> {
  if (!isActive(viewer)) return [];
  return sql<HousingPost[]>`
    select h.*, h.available_from::text, m.full_name as poster_name,
           case when m.show_email then m.email end as poster_email
    from housing_posts h
    join members m on m.id = h.posted_by
    where h.status = 'open'
    order by h.created_at desc
  `;
}

export async function postHousing(viewer: Member, h: {
  kind: string; title: string; area?: string | null; rentCents?: number | null;
  availableFrom?: string | null; description?: string | null;
}) {
  if (!isActive(viewer)) throw new Error('Only members can post.');
  if (!h.title.trim()) throw new Error('Give it a title.');
  const [row] = await sql<{ id: string }[]>`
    insert into housing_posts (posted_by, kind, title, area, rent_cents,
                               available_from, description)
    values (${viewer.id}, ${h.kind}, ${h.title.trim()}, ${h.area ?? null},
            ${h.rentCents ?? null}, ${h.availableFrom ?? null}, ${h.description ?? null})
    returning id
  `;
  return row.id;
}

export async function closeHousing(viewer: Member, id: string) {
  const [row] = await sql<{ id: string }[]>`
    update housing_posts set status = 'closed'
    where id = ${id} and posted_by = ${viewer.id} returning id
  `;
  if (!row) throw new Error('That is not your listing.');
}

// ───────────────────────── jobs ─────────────────────────

export type JobPost = {
  id: string; posted_by: string; poster_name: string; title: string;
  organisation: string; location: string | null; kind: string;
  link: string | null; description: string | null;
  closes_on: string | null; status: string; created_at: string;
};

export async function jobPosts(viewer: Member): Promise<JobPost[]> {
  if (!isActive(viewer)) return [];
  return sql<JobPost[]>`
    select j.*, j.closes_on::text, m.full_name as poster_name
    from job_posts j
    join members m on m.id = j.posted_by
    where j.status = 'open'
      and (j.closes_on is null or j.closes_on >= current_date)
    order by j.created_at desc
  `;
}

export async function postJob(viewer: Member, j: {
  title: string; organisation: string; location?: string | null; kind: string;
  link?: string | null; description?: string | null; closesOn?: string | null;
}) {
  if (!isActive(viewer)) throw new Error('Only members can post.');
  if (!j.title.trim() || !j.organisation.trim()) {
    throw new Error('A title and an organisation are both needed.');
  }
  if (j.link && !/^https?:\/\//.test(j.link)) {
    throw new Error('The link should start with https://');
  }
  const [row] = await sql<{ id: string }[]>`
    insert into job_posts (posted_by, title, organisation, location, kind,
                           link, description, closes_on)
    values (${viewer.id}, ${j.title.trim()}, ${j.organisation.trim()},
            ${j.location ?? null}, ${j.kind}, ${j.link ?? null},
            ${j.description ?? null}, ${j.closesOn ?? null})
    returning id
  `;
  return row.id;
}

export async function closeJob(viewer: Member, id: string) {
  const [row] = await sql<{ id: string }[]>`
    update job_posts set status = 'closed'
    where id = ${id} and posted_by = ${viewer.id} returning id
  `;
  if (!row) throw new Error('That is not your listing.');
}
