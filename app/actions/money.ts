'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, requireApproved } from '@/lib/session';
import * as Dues from '@/lib/queries/dues';
import * as Don from '@/lib/queries/donations';
import * as Ledger from '@/lib/queries/ledger';
import * as Tickets from '@/lib/queries/tickets';
import { updateSettings } from '@/lib/queries/settings';
import { parseAmount } from '@/lib/money';
import { sendMail } from '@/lib/mail';
import { sql } from '@/lib/db';
import type { AdjustmentKind, PaymentMethod, DonorType } from '@/lib/money';

export type FormState = { error?: string; ok?: string };

const today = () => new Date().toISOString().slice(0, 10);

function amount(fd: FormData, key = 'amount'): number | string {
  const cents = parseAmount(String(fd.get(key) ?? ''));
  if (cents === null) return 'That amount does not look like a number.';
  if (cents <= 0) return 'Amount must be more than zero.';
  return cents;
}

// ───────────────────────── dues ─────────────────────────

export async function assessTerm(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const n = await Dues.assessTerm(me, String(fd.get('term_id')));
    revalidatePath('/admin/dues');
    return { ok: `${n} charge${n === 1 ? '' : 's'} written.` };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function setTermDues(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const cents = amount(fd, 'dues');
    if (typeof cents === 'string') return { error: cents };
    await Dues.setTermDues(me, String(fd.get('term_id')), cents);
    revalidatePath('/admin/dues');
    return { ok: 'Rate updated.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function recordPayment(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const cents = amount(fd);
    if (typeof cents === 'string') return { error: cents };

    await Dues.recordPayment(me, {
      householdId: String(fd.get('household_id')),
      amountCents: cents,
      method: String(fd.get('method') ?? 'cash') as PaymentMethod,
      paidOn: String(fd.get('paid_on') || today()),
      termId: String(fd.get('term_id') ?? '') || null,
      fundId: String(fd.get('fund_id') ?? '') || null,
      note: String(fd.get('note') ?? '').trim() || null,
    });

    revalidatePath('/admin/dues');
    revalidatePath('/admin/dues/reconcile');
    revalidatePath('/portal/dues');
    return { ok: 'Payment recorded.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function waiveBalance(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const cents = amount(fd);
    if (typeof cents === 'string') return { error: cents };

    await Dues.addAdjustment(me, {
      householdId: String(fd.get('household_id')),
      kind: (String(fd.get('kind') ?? 'waiver')) as AdjustmentKind,
      amountCents: cents,
      reason: String(fd.get('reason') ?? ''),
      termId: String(fd.get('term_id') ?? '') || null,
    });

    revalidatePath('/admin/dues/reconcile');
    revalidatePath('/portal/dues');
    return { ok: 'Adjustment recorded.' };
  } catch (e) { return { error: (e as Error).message }; }
}

/**
 * The reminder. Warm and short on purpose — the last line is what makes
 * the Dues Assistance fund usable, because it invites people to ask.
 */
export async function sendReminders(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const ids = fd.getAll('household_id').map(String);
    if (!ids.length) return { error: 'Nobody selected.' };

    const rows = await sql<{ email: string; full_name: string; balance: string }[]>`
      select m.email, m.full_name,
        (coalesce((select sum(dc.amount_cents) from dues_charges dc
                   join members mm on mm.id = dc.member_id
                   where mm.household_id = m.household_id), 0)
         - coalesce((select sum(amount_cents) from payments
                     where household_id = m.household_id), 0)
         - coalesce((select sum(amount_cents) from adjustments
                     where household_id = m.household_id), 0))::text as balance
      from members m
      where m.household_id = any(${ids}) and m.status = 'active'
    `;

    for (const r of rows) {
      const owed = (Number(r.balance) / 100).toFixed(2);
      await sendMail({
        to: r.email,
        subject: 'UTBSA dues — no rush',
        text: `Assalamu alaikum ${r.full_name.split(' ')[0]},\n\n`
            + `Your dues balance is currently $${owed}. If you missed a semester it has carried over, which is normal and nothing to worry about.\n\n`
            + `You can pay whenever suits — cash to the treasurer at any event works fine.\n\n`
            + `And if now isn't a good time, please tell us. We have a fund for exactly this and nobody needs to explain themselves.\n\n`
            + `— UTBSA`,
      });
    }

    revalidatePath('/admin/dues/reconcile');
    return { ok: `Reminder sent to ${rows.length} member${rows.length === 1 ? '' : 's'}.` };
  } catch (e) { return { error: (e as Error).message }; }
}

// ───────────────────────── donations ─────────────────────────

export async function recordDonation(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const cents = amount(fd);
    if (typeof cents === 'string') return { error: cents };

    const name = String(fd.get('donor_name') ?? '').trim();
    if (!name) return { error: "The donor's name is required." };

    const donorId = await Don.findOrCreateDonor(me, {
      name,
      email: String(fd.get('donor_email') ?? '').trim() || null,
      type: String(fd.get('donor_type') ?? 'individual') as DonorType,
    });

    const isInKind = fd.get('is_in_kind') === 'on';

    await Don.recordDonation(me, {
      donorId,
      fundId: String(fd.get('fund_id')),
      amountCents: cents,
      receivedOn: String(fd.get('received_on') || today()),
      method: isInKind ? 'in_kind' : String(fd.get('method') ?? 'cash'),
      isInKind,
      inKindDescription: String(fd.get('in_kind_description') ?? '').trim() || null,
      note: String(fd.get('note') ?? '').trim() || null,
    });

    revalidatePath('/admin/donations');
    revalidatePath('/admin/funds');
    return { ok: 'Donation recorded.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function acknowledgeDonation(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    await Don.acknowledge(me, String(fd.get('id')));
    revalidatePath('/admin/donations');
    return { ok: 'Marked as thanked.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function createFund(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const name = String(fd.get('name') ?? '').trim();
    if (!name) return { error: 'Give the fund a name.' };
    await Don.createFund(me, name, fd.get('is_restricted') === 'on',
      String(fd.get('description') ?? '').trim() || null);
    revalidatePath('/admin/funds');
    return { ok: 'Fund created.' };
  } catch (e) { return { error: (e as Error).message }; }
}

// ───────────────────────── ledger ─────────────────────────

export async function recordExpense(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const cents = amount(fd);
    if (typeof cents === 'string') return { error: cents };
    const note = String(fd.get('note') ?? '').trim();
    if (!note) return { error: 'Say what this was for.' };

    await Ledger.recordExpense(me, {
      amountCents: cents,
      category: String(fd.get('category') ?? 'expense'),
      occurredOn: String(fd.get('occurred_on') || today()),
      note,
      fundId: String(fd.get('fund_id') ?? '') || null,
    });

    revalidatePath('/admin/ledger');
    return { ok: 'Expense recorded.' };
  } catch (e) { return { error: (e as Error).message }; }
}

// ───────────────────────── tickets and RSVP ─────────────────────────

export async function setRsvp(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await Tickets.setRsvp(
      me.id,
      String(fd.get('event_id')),
      Number(fd.get('guest_count') ?? 0),
      String(fd.get('note') ?? '').trim() || null
    );
    revalidatePath('/events');
    revalidatePath('/portal');
    return { ok: "You're on the list." };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function cancelRsvp(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await Tickets.cancelRsvp(me.id, String(fd.get('event_id')));
    revalidatePath('/events');
    return { ok: 'RSVP removed.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function recordTicketSale(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const cents = parseAmount(String(fd.get('amount') ?? '0'));
    if (cents === null) return { error: 'That amount does not look right.' };

    await Tickets.recordTicketSale(me, {
      eventId: String(fd.get('event_id')),
      purchaserName: String(fd.get('purchaser_name') ?? '').trim() || 'Walk-up',
      purchaserEmail: String(fd.get('purchaser_email') ?? '').trim() || null,
      qtyAdult: Number(fd.get('qty_adult') ?? 1),
      qtyChild: Number(fd.get('qty_child') ?? 0),
      amountCents: cents,
      method: String(fd.get('method') ?? 'cash'),
    });

    revalidatePath('/admin/events');
    return { ok: 'Sale recorded.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function cancelEvent(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const r = await Tickets.cancelAndRefund(me, String(fd.get('event_id')),
      String(fd.get('reason') ?? ''));
    revalidatePath('/admin/events');
    revalidatePath('/events');
    return { ok: `Cancelled. ${r.order_count} order(s) refunded.` };
  } catch (e) { return { error: (e as Error).message }; }
}

// ───────────────────────── status requests ─────────────────────────

export async function requestStatusChange(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await Tickets.requestStatusChange(me.id, me.member_type, String(fd.get('to_type')),
      String(fd.get('reason') ?? '').trim() || null);
    revalidatePath('/portal/profile');
    return { ok: 'Request sent. An admin will review it.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function decideStatusRequest(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    await Tickets.decideStatusRequest(me, String(fd.get('id')),
      String(fd.get('decision')) as 'approved' | 'declined',
      String(fd.get('note') ?? '').trim() || null);
    revalidatePath('/admin/requests');
    return { ok: 'Decided.' };
  } catch (e) { return { error: (e as Error).message }; }
}

// ───────────────────────── settings ─────────────────────────

export async function saveSettings(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    await updateSettings(me, {
      payments_enabled: fd.get('payments_enabled') === 'on',
      fee_mode: String(fd.get('fee_mode') ?? 'absorb') as any,
    });
    revalidatePath('/admin/settings');
    return { ok: 'Saved.' };
  } catch (e) { return { error: (e as Error).message }; }
}
