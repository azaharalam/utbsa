import 'server-only';
import { sql } from '@/lib/db';
import { audit } from '@/lib/audit';
import type { Member } from '@/lib/types';
import type { Fund, Donor, Donation, DonorType } from '@/lib/money';

function assertAdmin(actor: Member) {
  if (actor.role !== 'admin' || actor.status !== 'active') throw new Error('Admins only.');
}

/**
 * Fund balance = donations in − disbursements out.
 *
 * In-kind gifts are excluded. A donated sound system has value but you
 * cannot spend it on biryani, and mixing it into cash totals makes the
 * fund look richer than it is.
 */
export async function funds(actor: Member): Promise<Fund[]> {
  assertAdmin(actor);
  return sql<Fund[]>`
    select f.id, f.name, f.is_restricted, f.description,
      (coalesce((select sum(amount_cents) from donations d
                 where d.fund_id = f.id and not d.is_in_kind), 0)
       - coalesce((select sum(amount_cents) from ledger_entries le
                   where le.fund_id = f.id and le.direction = 'out'), 0)
      )::int as balance_cents
    from funds f
    order by f.is_restricted, f.name
  `;
}

export async function createFund(actor: Member, name: string, restricted: boolean, description: string | null) {
  assertAdmin(actor);
  const [row] = await sql<{ id: string }[]>`
    insert into funds (name, is_restricted, description)
    values (${name.trim()}, ${restricted}, ${description})
    returning id
  `;
  await audit(actor.id, 'fund.create', 'fund', row.id, { name: name.trim() });
  return row.id;
}

export async function donors(actor: Member, q = ''): Promise<Donor[]> {
  assertAdmin(actor);
  const term = `%${q.trim()}%`;
  return sql<Donor[]>`
    select d.*,
      coalesce((select sum(amount_cents) from donations dn
                where dn.donor_id = d.id and not dn.is_in_kind), 0)::int as total_cents
    from donors d
    where (${q.trim() === ''} or d.name ilike ${term} or d.email ilike ${term})
    order by total_cents desc, d.name
  `;
}

export async function findOrCreateDonor(
  actor: Member,
  d: { name: string; email: string | null; type: DonorType; memberId?: string | null }
) {
  assertAdmin(actor);

  if (d.email) {
    const [existing] = await sql<{ id: string }[]>`
      select id from donors where lower(email) = lower(${d.email}) limit 1
    `;
    if (existing) return existing.id;
  }

  const [row] = await sql<{ id: string }[]>`
    insert into donors (name, email, type, member_id)
    values (${d.name.trim()}, ${d.email}, ${d.type}, ${d.memberId ?? null})
    returning id
  `;
  await audit(actor.id, 'donor.create', 'donor', row.id, { name: d.name.trim() });
  return row.id;
}

export async function donations(
  actor: Member,
  opts: { fundId?: string; unacknowledged?: boolean } = {}
): Promise<Donation[]> {
  assertAdmin(actor);
  return sql<Donation[]>`
    select d.*, dr.name as donor_name, f.name as fund_name
    from donations d
    join donors dr on dr.id = d.donor_id
    join funds f on f.id = d.fund_id
    where (${!opts.fundId} or d.fund_id = ${opts.fundId ?? null})
      and (${!opts.unacknowledged} or d.acknowledged_at is null)
    order by d.received_on desc, d.created_at desc
  `;
}

/** Records the gift and its ledger entry together, in one transaction. */
export async function recordDonation(
  actor: Member,
  d: {
    donorId: string; fundId: string; amountCents: number; receivedOn: string;
    method: string; isInKind: boolean; inKindDescription?: string | null;
    note?: string | null;
  }
) {
  assertAdmin(actor);
  if (d.amountCents <= 0) throw new Error('Amount must be more than zero.');

  const id = await sql.begin(async (tx) => {
    const [row] = await tx<{ id: string }[]>`
      insert into donations (donor_id, fund_id, amount_cents, received_on, method,
                             is_in_kind, in_kind_description, note, recorded_by)
      values (${d.donorId}, ${d.fundId}, ${d.amountCents}, ${d.receivedOn}, ${d.method},
              ${d.isInKind}, ${d.inKindDescription ?? null}, ${d.note ?? null}, ${actor.id})
      returning id
    `;

    // In-kind gifts stay out of the cash ledger. They are real, but they
    // are not money, and adding them would overstate what UTBSA can spend.
    if (!d.isInKind) {
      await tx`
        insert into ledger_entries (occurred_on, direction, category, amount_cents,
                                    fund_id, source_type, source_id, note, recorded_by)
        values (${d.receivedOn}, 'in', 'donation', ${d.amountCents}, ${d.fundId},
                'donation', ${row.id}, ${d.note ?? null}, ${actor.id})
      `;
    }

    return row.id;
  });

  await audit(actor.id, 'donation.record', 'donation', id, {
    amount_cents: d.amountCents, in_kind: d.isInKind,
  });

  return id;
}

/** Donors who are not thanked do not give twice. */
export async function acknowledge(actor: Member, donationId: string) {
  assertAdmin(actor);
  await sql`update donations set acknowledged_at = now() where id = ${donationId}`;
  await audit(actor.id, 'donation.acknowledge', 'donation', donationId);
}
