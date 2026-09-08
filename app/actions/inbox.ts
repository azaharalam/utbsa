'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission, requireMember } from '@/lib/session';
import * as Inbox from '@/lib/queries/inbox';
import * as Tickets from '@/lib/queries/tickets';
import { parseAmount } from '@/lib/money';

export type FormState = { error?: string; ok?: string };

export async function setMessageHandled(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('members');
    await Inbox.setHandled(me, String(fd.get('id')), fd.get('handled') === '1');
    revalidatePath('/admin/messages');
    revalidatePath('/admin');
    return { ok: 'Updated.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function appeal(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireMember();
    await Inbox.appeal(me.id, String(fd.get('message') ?? ''));
    revalidatePath('/auth/pending');
    revalidatePath('/admin/messages');
    return { ok: 'Sent. Somebody on the e-board will read it and get back to you.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function checkInRsvp(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('events');
    await Tickets.checkIn(me, String(fd.get('id')));
    revalidatePath(`/admin/events/${fd.get('event_id')}`);
    return { ok: 'Checked in.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function sellTicket(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('events');
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

    revalidatePath(`/admin/events/${fd.get('event_id')}`);
    return { ok: 'Sale recorded.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function cancelEventAndRefund(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('events');
    const r = await Tickets.cancelAndRefund(me, String(fd.get('event_id')),
      String(fd.get('reason') ?? ''));
    revalidatePath(`/admin/events/${fd.get('event_id')}`);
    revalidatePath('/events');
    return { ok: `Cancelled. ${r.order_count} order(s) refunded.` };
  } catch (e) { return { error: (e as Error).message }; }
}
