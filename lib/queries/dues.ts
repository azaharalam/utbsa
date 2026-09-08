import 'server-only';
import { sql } from '@/lib/db';
import { audit } from '@/lib/audit';
import type { Member } from '@/lib/types';
import type { HouseholdBalance, DuesLine, PaymentMethod, AdjustmentKind } from '@/lib/money';

/**
 * ─────────────────────────────────────────────────────────────
 * BALANCES ARE COMPUTED HERE AND NOWHERE ELSE.
 *
 * There is no `balance` column anywhere in the schema, and there
 * must never be one. A stored balance is wrong the moment anyone
 * backdates a cash payment, issues a refund, or waives a charge.
 *
 *   balance = charges − payments − adjustments
 *
 * Positive means they owe. Negative is credit, which carries
 * forward automatically because it is just arithmetic.
 * ─────────────────────────────────────────────────────────────
 */

function assertAdmin(actor: Member) {
  if (actor.role !== 'admin' || actor.status !== 'active') throw new Error('Admins only.');
}

// ───────────────────────── reading ─────────────────────────

export async function householdBalance(householdId: string): Promise<number> {
  const [row] = await sql<{ balance: string }[]>`
    select (
      coalesce((select sum(dc.amount_cents) from dues_charges dc
                join members m on m.id = dc.member_id
                where m.household_id = ${householdId}), 0)
      - coalesce((select sum(amount_cents) from payments
                  where household_id = ${householdId}), 0)
      - coalesce((select sum(amount_cents) from adjustments
                  where household_id = ${householdId}), 0)
    )::text as balance
  `;
  return Number(row.balance);
}

/** Everything a member sees on their own dues page, oldest first. */
export async function memberLedger(memberId: string): Promise<DuesLine[]> {
  const [m] = await sql<{ household_id: string | null }[]>`
    select household_id from members where id = ${memberId}
  `;
  if (!m?.household_id) return [];

  return sql<DuesLine[]>`
    select 'charge' as kind,
           dc.assessed_at::date::text as occurred_on,
           ('Dues — ' || t.name) as description,
           dc.amount_cents as amount_cents
    from dues_charges dc
    join terms t on t.id = dc.term_id
    join members mm on mm.id = dc.member_id
    where mm.household_id = ${m.household_id}

    union all

    select 'payment',
           p.paid_on::text,
           ('Payment — ' || p.method),
           -p.amount_cents
    from payments p
    where p.household_id = ${m.household_id}

    union all

    select 'adjustment',
           a.created_at::date::text,
           (replace(a.kind, '_', ' ') || ' — ' || a.reason),
           -a.amount_cents
    from adjustments a
    where a.household_id = ${m.household_id}

    order by occurred_on
  `;
}

/** All households with a balance. The reconciliation list. */
export async function balances(
  actor: Member,
  opts: { onlyOwing?: boolean } = {}
): Promise<HouseholdBalance[]> {
  assertAdmin(actor);

  const rows = await sql<any[]>`
    select
      h.id as household_id,
      h.label,
      coalesce(string_agg(distinct m.full_name, ', '), '—') as member_names,
      coalesce(c.total, 0)::int as charged_cents,
      coalesce(p.total, 0)::int as paid_cents,
      coalesce(a.total, 0)::int as adjusted_cents,
      (coalesce(c.total,0) - coalesce(p.total,0) - coalesce(a.total,0))::int as balance_cents
    from households h
    left join members m on m.household_id = h.id
    left join lateral (
      select sum(dc.amount_cents) as total from dues_charges dc
      join members mm on mm.id = dc.member_id where mm.household_id = h.id
    ) c on true
    left join lateral (
      select sum(amount_cents) as total from payments where household_id = h.id
    ) p on true
    left join lateral (
      select sum(amount_cents) as total from adjustments where household_id = h.id
    ) a on true
    group by h.id, h.label, c.total, p.total, a.total
    order by balance_cents desc, member_names
  `;

  return opts.onlyOwing ? rows.filter((r) => r.balance_cents > 0) : rows;
}

// ───────────────────────── assessment ─────────────────────────

/** Preview before writing anything. */
export async function assessmentPreview(actor: Member, termId: string) {
  assertAdmin(actor);
  const [row] = await sql<{ n: string; dues_cents: number; name: string; already: string | null }[]>`
    select
      (select count(*)::text from members
       where status = 'active' and member_type = 'student') as n,
      t.dues_cents, t.name, t.dues_assessed_at::text as already
    from terms t where t.id = ${termId}
  `;
  return {
    student_count: Number(row.n),
    dues_cents: row.dues_cents,
    term_name: row.name,
    already_assessed: row.already,
    total_cents: Number(row.n) * row.dues_cents,
  };
}

/**
 * Charge every active student for a term.
 *
 * The amount is COPIED from the term onto each charge. It is never
 * joined back at read time — otherwise raising dues to $20 in 2028
 * would silently rewrite what everyone owed in 2026.
 *
 * `dues_assessed_at` makes this a one-time act, so a double click
 * cannot double-charge a hundred people.
 */
export async function assessTerm(actor: Member, termId: string) {
  assertAdmin(actor);

  const [term] = await sql<{ dues_cents: number; dues_assessed_at: string | null; name: string }[]>`
    select dues_cents, dues_assessed_at::text, name from terms where id = ${termId}
  `;
  if (!term) throw new Error('Unknown term.');
  if (term.dues_assessed_at) throw new Error(`${term.name} has already been assessed.`);

  const inserted = await sql<{ id: string }[]>`
    insert into dues_charges (member_id, term_id, amount_cents)
    select m.id, ${termId}, ${term.dues_cents}
    from members m
    where m.status = 'active' and m.member_type = 'student'
    on conflict (member_id, term_id) do nothing
    returning id
  `;

  await sql`update terms set dues_assessed_at = now() where id = ${termId}`;
  await audit(actor.id, 'dues.assess', 'term', termId, {
    charges: inserted.length, amount_cents: term.dues_cents,
  });

  return inserted.length;
}

export async function setTermDues(actor: Member, termId: string, cents: number) {
  assertAdmin(actor);
  await sql`update terms set dues_cents = ${cents} where id = ${termId}`;
  await audit(actor.id, 'dues.set_rate', 'term', termId, { amount_cents: cents });
}

// ───────────────────────── writing ─────────────────────────

/**
 * Record a payment. Writes the ledger entry in the SAME transaction,
 * so money can never appear in one place and not the other.
 */
export async function recordPayment(
  actor: Member,
  p: {
    householdId: string; amountCents: number; method: PaymentMethod;
    paidOn: string; termId?: string | null; fundId?: string | null;
    note?: string | null; externalRef?: string | null; rowHash?: string | null;
  }
) {
  assertAdmin(actor);
  if (p.amountCents <= 0) throw new Error('Amount must be more than zero.');
  if (p.method === 'fund' && !p.fundId) throw new Error('Pick a fund to pay from.');

  if (p.method === 'fund' && p.fundId) {
    const available = await fundBalance(p.fundId);
    if (available < p.amountCents) {
      throw new Error(`That fund only has ${(available / 100).toFixed(2)} available.`);
    }
  }

  const id = await sql.begin(async (tx) => {
    const [row] = await tx<{ id: string }[]>`
      insert into payments (household_id, amount_cents, method, fund_id, paid_on,
                            term_id, recorded_by, external_ref, row_hash, note)
      values (${p.householdId}, ${p.amountCents}, ${p.method}, ${p.fundId ?? null},
              ${p.paidOn}, ${p.termId ?? null}, ${actor.id},
              ${p.externalRef ?? null}, ${p.rowHash ?? null}, ${p.note ?? null})
      returning id
    `;

    // A fund payment moves money that is already ours, so it is a
    // disbursement out of the fund rather than new income.
    if (p.method === 'fund') {
      await tx`
        insert into ledger_entries (occurred_on, direction, category, amount_cents,
                                    fund_id, term_id, source_type, source_id, note, recorded_by)
        values (${p.paidOn}, 'out', 'fund_disbursement', ${p.amountCents},
                ${p.fundId ?? null}, ${p.termId ?? null}, 'payment', ${row.id},
                'Dues covered from fund', ${actor.id})
      `;
    } else {
      await tx`
        insert into ledger_entries (occurred_on, direction, category, amount_cents,
                                    term_id, source_type, source_id, note, recorded_by)
        values (${p.paidOn}, 'in', 'dues', ${p.amountCents}, ${p.termId ?? null},
                'payment', ${row.id}, ${p.note ?? null}, ${actor.id})
      `;
    }

    return row.id;
  });

  await audit(actor.id, 'payment.record', 'household', p.householdId, {
    amount_cents: p.amountCents, method: p.method,
  });

  return id;
}

/** Waive, write off, credit, or correct. Reason is mandatory. */
export async function addAdjustment(
  actor: Member,
  a: {
    householdId: string; kind: AdjustmentKind; amountCents: number;
    reason: string; termId?: string | null;
  }
) {
  assertAdmin(actor);
  if (!a.reason.trim()) throw new Error('A reason is required.');

  const [row] = await sql<{ id: string }[]>`
    insert into adjustments (household_id, kind, amount_cents, reason, term_id, created_by)
    values (${a.householdId}, ${a.kind}, ${a.amountCents}, ${a.reason.trim()},
            ${a.termId ?? null}, ${actor.id})
    returning id
  `;

  await audit(actor.id, `dues.${a.kind}`, 'household', a.householdId, {
    amount_cents: a.amountCents, reason: a.reason.trim(),
  });

  return row.id;
}

// ───────────────────────── households ─────────────────────────

export async function linkHousehold(actor: Member, memberId: string, targetMemberId: string) {
  assertAdmin(actor);
  const [target] = await sql<{ household_id: string | null }[]>`
    select household_id from members where id = ${targetMemberId}
  `;
  if (!target?.household_id) throw new Error('That member has no household.');

  await sql`update members set household_id = ${target.household_id} where id = ${memberId}`;
  await audit(actor.id, 'household.link', 'member', memberId, {
    household_id: target.household_id,
  });
}

export async function fundBalance(fundId: string): Promise<number> {
  const [row] = await sql<{ balance: string }[]>`
    select (
      coalesce((select sum(amount_cents) from donations where fund_id = ${fundId}
                and not is_in_kind), 0)
      - coalesce((select sum(amount_cents) from ledger_entries
                  where fund_id = ${fundId} and direction = 'out'), 0)
    )::text as balance
  `;
  return Number(row.balance);
}
