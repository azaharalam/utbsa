import 'server-only';
import { sql } from '@/lib/db';
import { audit, tracked } from '@/lib/audit';
import { can } from '@/lib/permissions';
import { randomToken, hashToken } from '@/lib/crypto';
import { recordPayment } from '@/lib/queries/dues';
import type { Member } from '@/lib/types';

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

export type PaymentClaim = {
  id: string;
  member_id: string;
  member_name: string;
  member_email: string;
  transaction_ref: string;
  amount_cents: number;
  sent_on: string;
  note: string | null;
  status: 'pending' | 'confirmed' | 'rejected';
  reject_reason: string | null;
  submitted_via: string;
  created_at: string;
  balance_cents?: number;
};

// ───────────────────────── tokens ─────────────────────────

/**
 * Issue a fresh claim link for a member.
 *
 * Rotating on every send means the newest dues email always holds the live
 * link and older ones stop working — a better control than an expiry clock,
 * because it survives someone opening the email three weeks later.
 */
export async function issueClaimToken(memberId: string): Promise<string> {
  const token = randomToken();
  await sql.begin(async (tx) => {
    await tx`delete from claim_tokens where member_id = ${memberId}`;
    await tx`insert into claim_tokens (token_hash, member_id)
             values (${hashToken(token)}, ${memberId})`;
  });
  return token;
}

/** Who does this link belong to? Returns nothing else. */
export async function resolveClaimToken(token: string) {
  const rows = await sql<{
    member_id: string; full_name: string; email: string; member_type: string;
  }[]>`
    select m.id as member_id, m.full_name, m.email, m.member_type
    from claim_tokens t
    join members m on m.id = t.member_id
    where t.token_hash = ${hashToken(token)}
      and m.status in ('active','inactive','alumni')
    limit 1
  `;
  if (rows[0]) {
    await sql`update claim_tokens set last_used_at = now()
              where token_hash = ${hashToken(token)}`;
  }
  return rows[0] ?? null;
}

// ───────────────────────── submitting ─────────────────────────

/**
 * Record what the member says they sent.
 *
 * This does NOT move their balance. It cannot: a transaction reference is
 * something anyone can type. The treasurer matches it against the real
 * account and confirms, and only then does a payment exist.
 */
export async function submitClaim(c: {
  memberId: string; transactionRef: string; amountCents: number;
  sentOn: string; note?: string | null; via: 'link' | 'portal';
}) {
  const ref = c.transactionRef.trim();
  if (ref.length < 3) throw new Error('That transaction ID looks too short.');
  if (c.amountCents <= 0) throw new Error('Enter the amount you sent.');

  const [dupe] = await sql<{ id: string }[]>`
    select id from payment_claims
    where lower(transaction_ref) = lower(${ref})
      and status in ('pending','confirmed')
  `;
  if (dupe) throw new Error('That transaction ID has already been submitted.');

  const [row] = await sql<{ id: string }[]>`
    insert into payment_claims (member_id, transaction_ref, amount_cents, sent_on,
                                method_label, note, submitted_via)
    values (${c.memberId}, ${ref}, ${c.amountCents}, ${c.sentOn},
            (select pay_method_label from settings where id = 1),
            ${c.note ?? null}, ${c.via})
    returning id
  `;
  return row.id;
}

/** A member's own claims, so they can see it is being looked at. */
export async function myClaims(memberId: string): Promise<PaymentClaim[]> {
  return sql<PaymentClaim[]>`
    select c.*, m.full_name as member_name, m.email as member_email
    from payment_claims c join members m on m.id = c.member_id
    where c.member_id = ${memberId}
    order by c.created_at desc
  `;
}

// ───────────────────────── reviewing ─────────────────────────

export async function listClaims(
  actor: Member,
  status: 'pending' | 'confirmed' | 'rejected' | 'all' = 'pending'
): Promise<PaymentClaim[]> {
  await assertAdmin(actor);
  return sql<PaymentClaim[]>`
    select c.*, m.full_name as member_name, m.email as member_email,
      (coalesce((select sum(amount_cents) from dues_charges where member_id = m.id), 0)
       - coalesce((select sum(amount_cents) from payments    where member_id = m.id), 0)
       - coalesce((select sum(amount_cents) from adjustments where member_id = m.id), 0)
      )::int as balance_cents
    from payment_claims c
    join members m on m.id = c.member_id
    where (${status === 'all'} or c.status = ${status === 'all' ? '' : status})
    order by c.created_at
  `;
}

export async function claimCounts(actor: Member) {
  await assertAdmin(actor);
  const rows = await sql<{ status: string; n: string }[]>`
    select status, count(*)::text n from payment_claims group by status
  `;
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])) as Record<string, number>;
}

/**
 * Confirm a claim — this is the moment money becomes real.
 *
 * Creates the payment (and its ledger entry) through the normal path, so
 * a confirmed transfer is indistinguishable from cash handed over at a
 * picnic. The claim keeps a pointer to the payment it produced.
 */
export async function confirmClaim(
  actor: Member,
  claimId: string,
  opts: { amountCents?: number; termId?: string | null } = {}
) {
  await assertAdmin(actor);

  const [claim] = await sql<any[]>`
    select * from payment_claims where id = ${claimId} and status = 'pending'
  `;
  if (!claim) throw new Error('That claim has already been reviewed.');

  const amount = opts.amountCents ?? claim.amount_cents;

  const paymentId = await recordPayment(actor, {
    memberId: claim.member_id,
    amountCents: amount,
    method: 'zelle',
    paidOn: claim.sent_on,
    termId: opts.termId ?? null,
    externalRef: claim.transaction_ref,
    note: `Transfer confirmed — ${claim.transaction_ref}`,
  });

  await tracked(actor.id, 'payment_claims', claimId, 'claim.confirm', async () => {
    await sql`
      update payment_claims
      set status = 'confirmed', reviewed_by = ${actor.id}, reviewed_at = now(),
          payment_id = ${paymentId}, amount_cents = ${amount}
      where id = ${claimId}
    `;
  });

  return paymentId;
}

export async function rejectClaim(actor: Member, claimId: string, reason: string) {
  await assertAdmin(actor);
  if (!reason.trim()) throw new Error('Give a reason — the member sees it.');

  const [row] = await sql<{ id: string }[]>`
    update payment_claims
    set status = 'rejected', reviewed_by = ${actor.id}, reviewed_at = now(),
        reject_reason = ${reason.trim()}
    where id = ${claimId} and status = 'pending'
    returning id
  `;
  if (!row) throw new Error('That claim has already been reviewed.');

  await tracked(actor.id, 'payment_claims', claimId, 'claim.reject', async () => {},
                { reason: reason.trim() });
}
