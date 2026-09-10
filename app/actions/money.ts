'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission, requireApproved } from '@/lib/session';
import * as Dues from '@/lib/queries/dues';
import * as Don from '@/lib/queries/donations';
import * as Ledger from '@/lib/queries/ledger';
import * as Tickets from '@/lib/queries/tickets';
import { updateSettings } from '@/lib/queries/settings';
import * as Claims from '@/lib/queries/claims';
import { parseAmount } from '@/lib/money';
import { sendMail } from '@/lib/mail';
import { getSettings } from '@/lib/queries/settings';
import { sendBulk, describeBulk } from '@/lib/bulk-mail';
import { sql } from '@/lib/db';
import type { AdjustmentKind, PaymentMethod, DonorType } from '@/lib/money';

export type FormState = { error?: string; ok?: string };

/**
 * A raw constraint violation tells the person nothing they can act on.
 * "new row for relation \"donors\" violates check constraint" is a message
 * for whoever wrote the code, not whoever is filling in the form.
 */
function friendlyDbError(e: unknown): string {
  const msg = (e as Error).message ?? 'Something went wrong.';
  if (msg.includes('violates check constraint')) {
    return 'One of the values here is not allowed. If you picked it from a dropdown, '
         + 'that is a bug — please report it.';
  }
  if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return 'That has already been recorded.';
  }
  if (msg.includes('violates foreign key')) {
    return 'Something this refers to no longer exists. Reload the page and try again.';
  }
  return msg;
}

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
    const me = await requirePermission('money');

    // Semester and year, not a term picker. The term is created if it does
    // not exist, so nothing has to be set up first.
    const season = String(fd.get('season') ?? '');
    const year = Number(fd.get('year') ?? 0);
    if (!season || !year) return { error: 'Pick a semester and a year.' };

    const termId = await Dues.findOrCreateTerm(season, year);
    const n = await Dues.assessTerm(me, termId);
    revalidatePath('/admin/dues');
    return { ok: `${n} charge${n === 1 ? '' : 's'} written.` };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function setTermDues(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('money');
    const cents = amount(fd, 'dues');
    if (typeof cents === 'string') return { error: cents };

    const season = String(fd.get('season') ?? '');
    const year = Number(fd.get('year') ?? 0);
    if (!season || !year) return { error: 'Pick a semester and a year.' };

    const termId = await Dues.findOrCreateTerm(season, year);
    await Dues.setTermDues(me, termId, cents);
    revalidatePath('/admin/dues');
    return { ok: 'Rate updated.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function recordPayment(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('money');
    const cents = amount(fd);
    if (typeof cents === 'string') return { error: cents };

    // Semester + year rather than a term picker. The term is created if it
    // does not exist yet, so the treasurer never has to set one up first.
    const season = String(fd.get('season') ?? '');
    const year = Number(fd.get('year') ?? 0);
    const termId = season && year ? await Dues.findOrCreateTerm(season, year) : null;

    await Dues.recordPayment(me, {
      memberId: String(fd.get('member_id')),
      amountCents: cents,
      method: String(fd.get('method') ?? 'cash') as PaymentMethod,
      paidOn: String(fd.get('paid_on') || today()),
      termId,
      fundId: String(fd.get('fund_id') ?? '') || null,
      note: String(fd.get('note') ?? '').trim() || null,
    });

    revalidatePath('/admin/dues');
    revalidatePath('/portal/dues');
    return { ok: 'Payment recorded.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function waiveBalance(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('money');
    const cents = amount(fd);
    if (typeof cents === 'string') return { error: cents };

    await Dues.addAdjustment(me, {
      memberId: String(fd.get('member_id')),
      kind: (String(fd.get('kind') ?? 'waiver')) as AdjustmentKind,
      amountCents: cents,
      reason: String(fd.get('reason') ?? ''),
      termId: String(fd.get('term_id') ?? '') || null,
    });

    revalidatePath('/admin/dues');
    revalidatePath('/portal/dues');
    return { ok: 'Adjustment recorded.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

/**
 * The reminder. Warm and short on purpose — the last line is what makes
 * the Dues Assistance fund usable, because it invites people to ask.
 */
export async function sendReminders(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('money');
    const ids = fd.getAll('member_id').map(String);
    if (!ids.length) return { error: 'Nobody selected.' };

    const rows = await sql<{ id: string; email: string; full_name: string; balance: string }[]>`
      select m.id, m.email, m.full_name,
        (coalesce((select sum(amount_cents) from dues_charges where member_id = m.id), 0)
         - coalesce((select sum(amount_cents) from payments    where member_id = m.id), 0)
         - coalesce((select sum(amount_cents) from adjustments where member_id = m.id), 0))::text as balance
      from members m
      where m.id = any(${ids}) and m.status = 'active'
    `;

    const settings = await getSettings();
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

    // Each recipient is attempted on its own. One bad address, or the
    // provider's daily limit, must not take the rest of the batch with it.
    const result = await sendBulk(rows, async (r) => {
      const owed = (Number(r.balance) / 100).toFixed(2);
      // A fresh link each time, which quietly retires any older one.
      const token = await Claims.issueClaimToken(r.id);

      return {
        subject: 'UTBSA dues — no rush',
        text: `Assalamu alaikum ${r.full_name.split(' ')[0]},\n\n`
            + `Your dues balance is currently $${owed}. If you missed a semester it has carried over, which is normal and nothing to worry about.\n\n`
            + `To pay, send it by ${settings.pay_method_label}:\n\n`
            + `  To:  ${settings.pay_to_name}\n`
            + `  At:  ${settings.pay_to_handle}\n\n`
            + `Then open this link and paste the transaction ID:\n\n`
            + `${site}/pay/${token}\n\n`
            + `The treasurer checks it against the account, so your balance will not update straight away.\n\n`
            + `If now isn't a good time, please tell us. We have a fund for exactly this and nobody needs to explain themselves.\n\n`
            + `— UTBSA`,
      };
    });

    revalidatePath('/admin/dues');

    // Report what actually happened, not how many rows were selected.
    return result.stoppedEarly || result.failed.length
      ? { error: describeBulk(result) }
      : { ok: describeBulk(result) };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

// ───────────────────────── donations ─────────────────────────

export async function recordDonation(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('money');
    const cents = amount(fd);
    if (typeof cents === 'string') return { error: cents };

    const name = String(fd.get('donor_name') ?? '').trim();
    if (!name) return { error: "The donor's name is required." };

    const donorId = await Don.findOrCreateDonor(me, {
      name,
      email: null,
      type: String(fd.get('donor_type') ?? 'individual') as DonorType,
    });

    // No fund picker on the form — gifts land in General unless someone
    // reassigns them from the gift list afterwards.
    const fundId = String(fd.get('fund_id') ?? '') || await Don.generalFundId();

    const isInKind = fd.get('is_in_kind') === 'on';

    await Don.recordDonation(me, {
      donorId,
      fundId,
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
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function acknowledgeDonation(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('money');
    await Don.acknowledge(me, String(fd.get('id')));
    revalidatePath('/admin/donations');
    return { ok: 'Marked as thanked.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function reassignDonationFund(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('money');
    await Don.reassignFund(me, String(fd.get('id')), String(fd.get('fund_id')));
    revalidatePath('/admin/donations');
    revalidatePath('/admin/funds');
    return { ok: 'Moved.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function createFund(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('money');
    const str = (k: string) => String(fd.get(k) ?? '').trim();

    // Optional opening gift. It becomes a real donation with a donor and a
    // date — the fund balance is still derived, never typed.
    const openingRaw = str('opening_amount');
    let opening = null;
    if (openingRaw) {
      const cents = parseAmount(openingRaw);
      if (cents === null) return { error: 'That opening amount does not look right.' };
      if (cents > 0) {
        if (!str('opening_donor')) {
          return { error: 'An opening gift needs a donor — who gave it?' };
        }
        opening = {
          donorName: str('opening_donor'),
          donorType: str('opening_donor_type') || 'organization',
          amountCents: cents,
          receivedOn: str('opening_received') || null,
          note: str('opening_note') || null,
        };
      }
    }

    await Don.createFund(me, {
      name: str('name'),
      description: str('description') || null,
      isRestricted: fd.get('is_restricted') === 'on',
      opening,
    });

    revalidatePath('/admin/funds');
    revalidatePath('/admin/donations');
    return { ok: opening ? 'Fund created, and the gift recorded against it.' : 'Fund created.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

// ───────────────────────── ledger ─────────────────────────

export async function recordExpense(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('money');
    const cents = amount(fd);
    if (typeof cents === 'string') return { error: cents };
    const category = String(fd.get('category') ?? 'Other');
    const note = String(fd.get('note') ?? '').trim();
    if (!note) return { error: 'Say what this was for.' };
    if (category === 'Other' && note.length < 5) {
      return { error: 'When the category is Other, describe what it was for.' };
    }

    await Ledger.recordExpense(me, {
      amountCents: cents,
      category,
      occurredOn: String(fd.get('occurred_on') || today()),
      note,
      fundId: String(fd.get('fund_id') ?? '') || null,
    });

    revalidatePath('/admin/ledger');
    return { ok: 'Expense recorded.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

// ───────────────────────── tickets and RSVP ─────────────────────────

export async function setRsvp(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await Tickets.setRsvp(
      me.id,
      String(fd.get('event_id')),
      Number(fd.get('adults') ?? 1),
      Number(fd.get('children') ?? 0),
      String(fd.get('note') ?? '').trim() || null
    );
    revalidatePath('/events');
    revalidatePath('/portal');
    return { ok: 'Noted — thank you.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function cancelRsvp(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await Tickets.cancelRsvp(me.id, String(fd.get('event_id')));
    revalidatePath('/events');
    return { ok: 'RSVP removed.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function recordTicketSale(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('money');
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
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function cancelEvent(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('money');
    const r = await Tickets.cancelAndRefund(me, String(fd.get('event_id')),
      String(fd.get('reason') ?? ''));
    revalidatePath('/admin/events');
    revalidatePath('/events');
    return { ok: `Cancelled. ${r.order_count} order(s) refunded.` };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

// ───────────────────────── status requests ─────────────────────────

export async function requestStatusChange(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await Tickets.requestStatusChange(me.id, me.member_type, String(fd.get('to_type')),
      String(fd.get('reason') ?? '').trim() || null);
    revalidatePath('/portal/profile');
    return { ok: 'Request sent. An admin will review it.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function decideStatusRequest(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('money');
    await Tickets.decideStatusRequest(me, String(fd.get('id')),
      String(fd.get('decision')) as 'approved' | 'declined',
      String(fd.get('note') ?? '').trim() || null);
    revalidatePath('/admin/requests');
    return { ok: 'Decided.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

// ───────────────────────── payment claims ─────────────────────────

/**
 * A member telling us they sent money. This creates a CLAIM, never a payment —
 * a transaction reference is something anyone can type. The treasurer matches
 * it against the real account before a balance moves.
 */
export async function submitPaymentClaim(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const via = String(fd.get('via') ?? 'portal') as 'link' | 'portal';

    let memberId: string;
    if (via === 'link') {
      const who = await Claims.resolveClaimToken(String(fd.get('token') ?? ''));
      if (!who) return { error: 'That link is no longer valid. Ask the treasurer for a new one.' };
      memberId = who.member_id;
    } else {
      const me = await requireApproved();
      memberId = me.id;
    }

    const cents = amount(fd);
    if (typeof cents === 'string') return { error: cents };

    await Claims.submitClaim({
      memberId,
      transactionRef: String(fd.get('transaction_ref') ?? ''),
      amountCents: cents,
      sentOn: String(fd.get('sent_on') || today()),
      note: String(fd.get('note') ?? '').trim() || null,
      via,
    });

    revalidatePath('/portal/dues');
    revalidatePath('/admin/claims');
    return { ok: 'Thank you. The treasurer will check it against the account.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function confirmClaim(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('money');
    const season = String(fd.get('season') ?? '');
    const year = Number(fd.get('year') ?? 0);
    const termId = season && year ? await Dues.findOrCreateTerm(season, year) : null;

    const raw = String(fd.get('amount') ?? '');
    const cents = raw ? parseAmount(raw) : null;

    await Claims.confirmClaim(me, String(fd.get('id')), {
      amountCents: cents ?? undefined, termId,
    });

    revalidatePath('/admin/claims');
    revalidatePath('/admin/dues');
    revalidatePath('/portal/dues');
    return { ok: 'Confirmed and recorded.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function rejectClaim(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('money');
    await Claims.rejectClaim(me, String(fd.get('id')), String(fd.get('reason') ?? ''));
    revalidatePath('/admin/claims');
    return { ok: 'Rejected. The member can see the reason.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

// ───────────────────────── settings ─────────────────────────

export async function saveSettings(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('money');
    await updateSettings(me, {
      current_session:  String(fd.get('current_session') ?? '').trim() || undefined,
      pay_method_label: String(fd.get('pay_method_label') ?? '').trim() || 'Zelle',
      pay_to_name:      String(fd.get('pay_to_name') ?? '').trim() || 'UTBSA',
      pay_to_handle:    String(fd.get('pay_to_handle') ?? '').trim(),
      pay_instructions: String(fd.get('pay_instructions') ?? '').trim() || null,
    });
    revalidatePath('/admin/settings');
    return { ok: 'Saved.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}
