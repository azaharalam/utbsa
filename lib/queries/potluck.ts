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

export async function potluckSummary(eventId: string) {
  const items = await itemsFor(eventId);
  const claimed = items.filter((i) => i.claimed_by);
  return {
    total: items.length,
    claimed: claimed.length,
    open: items.length - claimed.length,
    covered: claimed.reduce((s, i) => s + i.covers, 0),
    needed: items.reduce((s, i) => s + i.covers, 0),
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
