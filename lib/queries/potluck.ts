import 'server-only';
import { sql } from '@/lib/db';
import { tracked, trackedCreate, trackedDelete } from '@/lib/audit';
import { can } from '@/lib/permissions';
import { categoryOrder } from '@/lib/potluck';
import type { Member } from '@/lib/types';

/**
 * A potluck item is one dish for one person to bring.
 *
 * Three beef rows means three people each cooking for fifteen — which is why
 * rows are duplicated rather than carrying a quantity. Members claim a row
 * with one tap and type nothing.
 */

export type PotluckItem = {
  id: string; event_id: string; category: string; dish: string;
  covers: number; note: string | null; sort_order: number;
  claimed_by: string | null; claimed_by_name: string | null;
  claimed_household: string | null; claimed_at: string | null;
};

async function assertEvents(actor: Member) {
  if (actor.status !== 'active' || !(await can(actor.id, 'events'))) {
    throw new Error('You do not have access to this.');
  }
}

export async function itemsFor(eventId: string): Promise<PotluckItem[]> {
  return sql<PotluckItem[]>`
    select p.*, m.full_name as claimed_by_name, m.household_id as claimed_household
    from potluck_items p
    left join members m on m.id = p.claimed_by
    where p.event_id = ${eventId}
    order by p.sort_order, p.created_at
  `;
}

/**
 * `feeds` is a plain total, deliberately not measured against the RSVP count.
 * More people turn up than answer, so a "covered / needed" ratio would say
 * there is enough food when there is not, which is worse than saying nothing.
 */
export async function potluckSummary(eventId: string) {
  const items = await itemsFor(eventId);
  const claimed = items.filter((i) => i.claimed_by);
  return {
    total: items.length,
    claimed: claimed.length,
    open: items.length - claimed.length,
    feeds: items.reduce((s, i) => s + i.covers, 0),
    feedsClaimed: claimed.reduce((s, i) => s + i.covers, 0),
  };
}

// ───────────────────────── organising ─────────────────────────

export async function addItem(actor: Member, i: {
  eventId: string; category: string; dish: string; covers: number; note?: string | null;
}) {
  await assertEvents(actor);
  if (!i.dish.trim()) throw new Error('Give the dish a name.');

  const [row] = await sql<{ id: string }[]>`
    insert into potluck_items (event_id, category, dish, covers, note, sort_order)
    values (${i.eventId}, ${i.category}, ${i.dish.trim()}, ${i.covers},
            ${i.note ?? null}, ${categoryOrder(i.category)})
    returning id
  `;
  await trackedCreate(actor.id, 'potluck_items', row.id, 'potluck.add');
  return row.id;
}

/**
 * Add one dish, optionally split into several portions.
 *
 * Nobody cooks rice for 120. The organiser types "Rice, 120 people, 4 ways"
 * and gets four rows of 30 — a shortcut for typing four near-identical rows,
 * and nothing more. The rows are ordinary independent dishes the moment they
 * exist: separately editable, deletable and claimable. Nothing records that
 * they came from a split, and there is no such thing as re-splitting.
 *
 * The remainder rides on the last portion: 100 across 3 gives 33, 33, 34.
 */
export async function addItems(actor: Member, i: {
  eventId: string; category: string; dish: string; covers: number;
  splitInto?: number; note?: string | null;
}) {
  await assertEvents(actor);
  const dish = i.dish.trim();
  if (!dish) throw new Error('Give the dish a name.');

  const ways = Math.max(1, Math.min(20, i.splitInto ?? 1));
  const base = Math.floor(i.covers / ways);
  const ids: string[] = [];

  for (let n = 1; n <= ways; n++) {
    const covers = n === ways ? i.covers - base * (ways - 1) : base;
    const label = ways > 1 ? `${dish} (${n} of ${ways})` : dish;

    const [row] = await sql<{ id: string }[]>`
      insert into potluck_items (event_id, category, dish, covers, note, sort_order)
      values (${i.eventId}, ${i.category}, ${label}, ${covers},
              ${i.note ?? null}, ${categoryOrder(i.category)})
      returning id
    `;
    await trackedCreate(actor.id, 'potluck_items', row.id, 'potluck.add');
    ids.push(row.id);
  }
  return ids;
}

/**
 * Put a dish against somebody who said they would bring it in person.
 *
 * Admin only — a member cannot volunteer anyone but themselves, because
 * being committed in public without knowing is how people end up annoyed.
 */
export async function assignItem(actor: Member, itemId: string, memberId: string) {
  await assertEvents(actor);
  const [row] = await sql<{ id: string; dish: string }[]>`
    update potluck_items
    set claimed_by = ${memberId}, claimed_at = now()
    where id = ${itemId} and claimed_by is null
    returning id, dish
  `;
  if (!row) throw new Error('Someone has already taken that one.');
  await tracked(actor.id, 'potluck_items', itemId, 'potluck.assign', async () => {});
  return row.dish;
}

/**
 * Duplicate a row so the same dish can be split between several people.
 * The copy is fully editable — usually the organiser only changes `covers`.
 */
export async function duplicateItem(actor: Member, itemId: string) {
  await assertEvents(actor);
  const [row] = await sql<{ id: string }[]>`
    insert into potluck_items (event_id, category, dish, covers, note, sort_order)
    select event_id, category, dish, covers, note, sort_order
    from potluck_items where id = ${itemId}
    returning id
  `;
  if (!row) throw new Error('That item no longer exists.');
  await trackedCreate(actor.id, 'potluck_items', row.id, 'potluck.duplicate');
  return row.id;
}

export async function updateItem(actor: Member, itemId: string, i: {
  category: string; dish: string; covers: number; note?: string | null;
}) {
  await assertEvents(actor);

  // Somebody agreed to bring a specific thing. Changing it under them means
  // they arrive with the wrong dish. Release it first, then edit.
  const [claimed] = await sql<{ dish: string; name: string }[]>`
    select p.dish, m.full_name as name from potluck_items p
    join members m on m.id = p.claimed_by
    where p.id = ${itemId}
  `;
  if (claimed) {
    throw new Error(
      `${claimed.name} has already offered to bring ${claimed.dish}. `
      + `Release it first if it needs changing.`
    );
  }

  await tracked(actor.id, 'potluck_items', itemId, 'potluck.update', async () => {
    await sql`
      update potluck_items
      set category = ${i.category}, dish = ${i.dish.trim()}, covers = ${i.covers},
          note = ${i.note ?? null}, sort_order = ${categoryOrder(i.category)}
      where id = ${itemId}
    `;
  });
}

export async function removeItem(actor: Member, itemId: string) {
  await assertEvents(actor);
  const [row] = await sql<{ claimed_by: string | null; dish: string }[]>`
    select claimed_by, dish from potluck_items where id = ${itemId}
  `;
  if (row?.claimed_by) {
    throw new Error(`Somebody has already offered to bring ${row.dish}. Ask them first.`);
  }
  await trackedDelete(actor.id, 'potluck_items', itemId, 'potluck.remove', async () => {
    await sql`delete from potluck_items where id = ${itemId}`;
  });
}

// ───────────────────────── claiming ─────────────────────────

/**
 * Claim a dish. One tap, no typing.
 *
 * The UPDATE only matches an unclaimed row, so two people tapping at the same
 * moment cannot both get it — the second finds nothing and is told so.
 */
export async function claimItem(member: Member, itemId: string) {
  if (!['active', 'inactive', 'alumni'].includes(member.status)) {
    throw new Error('Only members can sign up.');
  }
  const [row] = await sql<{ id: string; dish: string }[]>`
    update potluck_items
    set claimed_by = ${member.id}, claimed_at = now()
    where id = ${itemId} and claimed_by is null
    returning id, dish
  `;
  if (!row) throw new Error('Someone else just took that one.');
  return row.dish;
}

/** Anyone in the same household can release it — they share the cooking. */
export async function releaseItem(member: Member, itemId: string) {
  const [row] = await sql<{ id: string }[]>`
    update potluck_items p
    set claimed_by = null, claimed_at = null
    from members m
    where p.id = ${itemId}
      and m.id = p.claimed_by
      and (p.claimed_by = ${member.id}
           or (m.household_id is not null and m.household_id = (
                 select household_id from members where id = ${member.id})))
    returning p.id
  `;
  if (!row) throw new Error('That is not yours to release.');
}

/** Everything this household has offered to bring. */
export async function claimsByHousehold(memberId: string, eventId: string) {
  return sql<PotluckItem[]>`
    select p.*, m.full_name as claimed_by_name, m.household_id as claimed_household
    from potluck_items p
    join members m on m.id = p.claimed_by
    where p.event_id = ${eventId}
      and (p.claimed_by = ${memberId}
           or (m.household_id is not null and m.household_id = (
                 select household_id from members where id = ${memberId})))
    order by p.sort_order
  `;
}
