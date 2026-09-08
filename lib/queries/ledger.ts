import 'server-only';
import { sql } from '@/lib/db';
import { audit } from '@/lib/audit';
import { can } from '@/lib/permissions';
import type { Member } from '@/lib/types';
import type { LedgerEntry } from '@/lib/money';

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

export async function entries(
  actor: Member,
  opts: { termId?: string; category?: string; fundId?: string; limit?: number } = {}
): Promise<LedgerEntry[]> {
  await assertAdmin(actor);
  return sql<LedgerEntry[]>`
    select le.id, le.occurred_on::text, le.direction, le.category,
           le.amount_cents, le.note, le.source_type, f.name as fund_name
    from ledger_entries le
    left join funds f on f.id = le.fund_id
    where (${!opts.termId}   or le.term_id  = ${opts.termId ?? null})
      and (${!opts.category} or le.category = ${opts.category ?? ''})
      and (${!opts.fundId}   or le.fund_id  = ${opts.fundId ?? null})
    order by le.occurred_on desc, le.created_at desc
    limit ${opts.limit ?? 500}
  `;
}

export async function totals(actor: Member, termId?: string) {
  await assertAdmin(actor);
  const rows = await sql<{ direction: string; category: string; total: string }[]>`
    select direction, category, sum(amount_cents)::text as total
    from ledger_entries
    where (${!termId} or term_id = ${termId ?? null})
    group by direction, category
  `;

  let inTotal = 0, outTotal = 0;
  const byCategory: Record<string, number> = {};
  for (const r of rows) {
    const n = Number(r.total);
    byCategory[`${r.direction}:${r.category}`] = n;
    if (r.direction === 'in') inTotal += n; else outTotal += n;
  }
  return { inTotal, outTotal, net: inTotal - outTotal, byCategory };
}

/** Recorded, because exporting the whole ledger is worth a trace. */
export async function recordExport(actor: Member, what: string, rowCount: number) {
  await assertAdmin(actor);
  await audit(actor.id, 'export', 'ledger', undefined, { what, rows: rowCount });
}

/** A cost or expense that did not come from a payment or donation. */
export async function recordExpense(
  actor: Member,
  e: { amountCents: number; category: string; occurredOn: string; note: string; fundId?: string | null; termId?: string | null }
) {
  await assertAdmin(actor);
  if (e.amountCents <= 0) throw new Error('Amount must be more than zero.');

  const [row] = await sql<{ id: string }[]>`
    insert into ledger_entries (occurred_on, direction, category, amount_cents,
                                fund_id, term_id, note, recorded_by)
    values (${e.occurredOn}, 'out', ${e.category}, ${e.amountCents},
            ${e.fundId ?? null}, ${e.termId ?? null}, ${e.note}, ${actor.id})
    returning id
  `;
  await audit(actor.id, 'expense.record', 'ledger', row.id, {
    amount_cents: e.amountCents, category: e.category,
  });
  return row.id;
}
