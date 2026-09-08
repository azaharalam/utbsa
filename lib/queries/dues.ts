import 'server-only';
import { sql } from '@/lib/db';
import { audit, trackedCreate, trackedDelete, tracked } from '@/lib/audit';
import { can } from '@/lib/permissions';
import type { Member } from '@/lib/types';
import type { MemberBalance, DuesLine, PaymentMethod, AdjustmentKind } from '@/lib/money';

/**
 * ─────────────────────────────────────────────────────────────
 * BALANCES ARE COMPUTED HERE AND NOWHERE ELSE.
 *
 * There is no `balance` column in the schema and there must never
 * be one. A stored balance is wrong the moment anyone backdates a
 * cash payment, issues a refund, or waives a charge.
 *
 *   balance = charges − payments − adjustments
 *
 * All three point at a member. Positive means they owe; negative is
 * credit, which carries forward because it is just arithmetic.
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Access comes from the office someone holds, never from a flag on their
 * account. The page guard already checked this, but a server action is a
 * public HTTP endpoint — it must never trust its caller.
 */
async function assertAdmin(actor: Member) {
  if (actor.status !== 'active' || !(await can(actor.id, 'money'))) {
    throw new Error('You do not have access to this.');
  }
}

// ───────────────────────── reading ─────────────────────────

export async function memberBalance(memberId: string): Promise<number> {
  const [row] = await sql<{ balance: string }[]>`
    select (
      coalesce((select sum(amount_cents) from dues_charges where member_id = ${memberId}), 0)
      - coalesce((select sum(amount_cents) from payments    where member_id = ${memberId}), 0)
      - coalesce((select sum(amount_cents) from adjustments where member_id = ${memberId}), 0)
    )::text as balance
  `;
  return Number(row.balance);
}

/** The member's own history, oldest first. */
export async function memberLedger(memberId: string): Promise<DuesLine[]> {
  return sql<DuesLine[]>`
    select 'charge' as kind,
           dc.assessed_at::date::text as occurred_on,
           ('Dues — ' || t.name) as description,
           dc.amount_cents as amount_cents
    from dues_charges dc
    join terms t on t.id = dc.term_id
    where dc.member_id = ${memberId}

    union all

    select 'payment', p.paid_on::text, ('Payment — ' || p.method), -p.amount_cents
    from payments p where p.member_id = ${memberId}

    union all

    select 'adjustment', a.created_at::date::text,
           (replace(a.kind, '_', ' ') || ' — ' || a.reason), -a.amount_cents
    from adjustments a where a.member_id = ${memberId}

    order by occurred_on
  `;
}

/** Every member with their balance. Drives the dues table. */
export async function balances(
  actor: Member,
  opts: { onlyOwing?: boolean } = {}
): Promise<MemberBalance[]> {
  await assertAdmin(actor);

  const rows = await sql<any[]>`
    select
      m.id as member_id, m.full_name, m.email, m.member_type,
      m.student_level, m.department, m.photo_url,
      coalesce(c.total, 0)::int as charged_cents,
      coalesce(p.total, 0)::int as paid_cents,
      coalesce(a.total, 0)::int as adjusted_cents,
      (coalesce(c.total,0) - coalesce(p.total,0) - coalesce(a.total,0))::int as balance_cents
    from members m
    left join lateral (select sum(amount_cents) total from dues_charges where member_id = m.id) c on true
    left join lateral (select sum(amount_cents) total from payments    where member_id = m.id) p on true
    left join lateral (select sum(amount_cents) total from adjustments where member_id = m.id) a on true
    where m.status in ('active','inactive','alumni')
    order by (coalesce(c.total,0) - coalesce(p.total,0) - coalesce(a.total,0)) desc, m.full_name
  `;

  return opts.onlyOwing ? rows.filter((r) => r.balance_cents > 0) : rows;
}

// ───────────────────────── terms ─────────────────────────

/**
 * Payments are recorded by semester and year rather than by picking a term
 * from a list. If that term does not exist yet it is created, so the
 * treasurer never has to set one up before recording money.
 */
export async function findOrCreateTerm(season: string, year: number): Promise<string> {
  const [existing] = await sql<{ id: string }[]>`
    select id from terms where season = ${season} and year = ${year}
  `;
  if (existing) return existing.id;

  const label = season[0].toUpperCase() + season.slice(1);
  const starts = season === 'spring' ? `${year}-01-10`
               : season === 'summer' ? `${year}-05-15` : `${year}-08-20`;
  const ends   = season === 'spring' ? `${year}-05-05`
               : season === 'summer' ? `${year}-08-10` : `${year}-12-15`;

  const [row] = await sql<{ id: string }[]>`
    insert into terms (name, season, year, starts_on, ends_on, dues_cents)
    values (${label + ' ' + year}, ${season}, ${year}, ${starts}, ${ends},
            (select dues_default_cents from settings where id = 1))
    returning id
  `;
  return row.id;
}

export async function assessmentPreview(actor: Member, termId: string) {
  await assertAdmin(actor);
  const [row] = await sql<any[]>`
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
 * The amount is COPIED onto each charge, never joined back at read time —
 * otherwise raising dues to $20 in 2028 would rewrite what people owed in
 * 2026. `dues_assessed_at` makes this a one-time act, so a double click
 * cannot double-charge everyone.
 */
/** Preview for a semester and year, creating the term if it does not exist. */
export async function previewFor(actor: Member, season: string, year: number) {
  await assertAdmin(actor);
  const termId = await findOrCreateTerm(season, year);
  return { ...(await assessmentPreview(actor, termId)), term_id: termId };
}

export async function assessTerm(actor: Member, termId: string) {
  await assertAdmin(actor);

  const [term] = await sql<any[]>`
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

  await tracked(actor.id, 'terms', termId, 'dues.assess', async () => {
    await sql`update terms set dues_assessed_at = now() where id = ${termId}`;
  }, { charges: inserted.length, amount_cents: term.dues_cents });

  return inserted.length;
}

export async function setTermDues(actor: Member, termId: string, cents: number) {
  await assertAdmin(actor);
  await tracked(actor.id, 'terms', termId, 'dues.set_rate', async () => {
    await sql`update terms set dues_cents = ${cents} where id = ${termId}`;
  });
}

// ───────────────────────── writing ─────────────────────────

/** Records the payment and its ledger entry in one transaction, so money
 *  can never appear in one place and not the other. */
export async function recordPayment(
  actor: Member,
  p: {
    memberId: string; amountCents: number; method: PaymentMethod;
    paidOn: string; termId?: string | null; fundId?: string | null;
    note?: string | null; externalRef?: string | null; rowHash?: string | null;
  }
) {
  await assertAdmin(actor);
  if (p.amountCents <= 0) throw new Error('Amount must be more than zero.');
  if (p.method === 'fund' && !p.fundId) throw new Error('Pick a fund to pay from.');

  if (p.method === 'fund' && p.fundId) {
    const available = await fundBalance(p.fundId);
    if (available < p.amountCents) {
      throw new Error(`That fund only has $${(available / 100).toFixed(2)} available.`);
    }
  }

  const id = await sql.begin(async (tx) => {
    const [row] = await tx<{ id: string }[]>`
      insert into payments (member_id, amount_cents, method, fund_id, paid_on,
                            term_id, recorded_by, external_ref, row_hash, note)
      values (${p.memberId}, ${p.amountCents}, ${p.method}, ${p.fundId ?? null},
              ${p.paidOn}, ${p.termId ?? null}, ${actor.id},
              ${p.externalRef ?? null}, ${p.rowHash ?? null}, ${p.note ?? null})
      returning id
    `;

    // Paying from a fund moves money that is already ours, so it is a
    // disbursement out of that fund rather than new income.
    if (p.method === 'fund') {
      await tx`
        insert into ledger_entries (occurred_on, direction, category, amount_cents,
                                    fund_id, term_id, source_type, source_id, note, recorded_by)
        values (${p.paidOn}, 'out', 'fund_disbursement', ${p.amountCents},
                ${p.fundId ?? null}, ${p.termId ?? null}, 'payment', ${row.id},
                'Dues covered from fund', ${actor.id})`;
    } else {
      await tx`
        insert into ledger_entries (occurred_on, direction, category, amount_cents,
                                    term_id, source_type, source_id, note, recorded_by)
        values (${p.paidOn}, 'in', 'dues', ${p.amountCents}, ${p.termId ?? null},
                'payment', ${row.id}, ${p.note ?? null}, ${actor.id})`;
    }

    return row.id;
  });

  await trackedCreate(actor.id, 'payments', id, 'payment.record',
    { member_id: p.memberId });

  return id;
}

/** Waive, write off, credit, or correct. Reason is mandatory. */
export async function addAdjustment(
  actor: Member,
  a: {
    memberId: string; kind: AdjustmentKind; amountCents: number;
    reason: string; termId?: string | null;
  }
) {
  await assertAdmin(actor);
  if (!a.reason.trim()) throw new Error('A reason is required.');

  const [row] = await sql<{ id: string }[]>`
    insert into adjustments (member_id, kind, amount_cents, reason, term_id, created_by)
    values (${a.memberId}, ${a.kind}, ${a.amountCents}, ${a.reason.trim()},
            ${a.termId ?? null}, ${actor.id})
    returning id
  `;

  await trackedCreate(actor.id, 'adjustments', row.id, `dues.${a.kind}`,
    { member_id: a.memberId });

  return row.id;
}

export async function fundBalance(fundId: string): Promise<number> {
  const [row] = await sql<{ balance: string }[]>`
    select (
      coalesce((select sum(amount_cents) from donations
                where fund_id = ${fundId} and not is_in_kind), 0)
      - coalesce((select sum(amount_cents) from ledger_entries
                  where fund_id = ${fundId} and direction = 'out'), 0)
    )::text as balance
  `;
  return Number(row.balance);
}
