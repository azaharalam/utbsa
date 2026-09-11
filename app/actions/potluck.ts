'use server';

import { revalidatePath } from 'next/cache';
import { requireApproved, requirePermission } from '@/lib/session';
import * as P from '@/lib/queries/potluck';
import * as H from '@/lib/queries/households';

export type FormState = { error?: string; ok?: string };

const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

// ───────────────────────── claiming ─────────────────────────

export async function claimPotluckItem(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    const dish = await P.claimItem(me, s(fd, 'id'));
    revalidatePath('/events');
    return { ok: `You are bringing ${dish}. Thank you.` };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function releasePotluckItem(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await P.releaseItem(me, s(fd, 'id'));
    revalidatePath('/events');
    return { ok: 'Released — someone else can take it.' };
  } catch (e) { return { error: (e as Error).message }; }
}

// ───────────────────────── organising ─────────────────────────

export async function addPotluckItem(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('events');
    const covers = Number(fd.get('covers') ?? 10);
    const split = Number(fd.get('split_into') ?? 1);

    const ids = await P.addItems(me, {
      eventId: s(fd, 'event_id'),
      category: s(fd, 'category') || 'rice',
      dish: s(fd, 'dish'),
      covers,
      splitInto: split,
      note: s(fd, 'note') || null,
    });
    revalidatePath(`/admin/events/${s(fd, 'event_id')}`);
    return {
      ok: ids.length > 1
        ? `Added ${ids.length} portions of ${Math.floor(covers / ids.length)}–`
          + `${covers - Math.floor(covers / ids.length) * (ids.length - 1)}.`
        : 'Added.',
    };
  } catch (e) { return { error: (e as Error).message }; }
}

/** Put a dish against somebody who offered in person. Admin only. */
export async function assignPotluckItem(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('events');
    const dish = await P.assignItem(me, s(fd, 'item_id'), s(fd, 'member_id'));
    revalidatePath(`/admin/events/${s(fd, 'event_id')}`);
    return { ok: `${dish} assigned.` };
  } catch (e) { return { error: (e as Error).message }; }
}

/** Same dish, another cook. The copy is editable — usually only `covers`. */
export async function duplicatePotluckItem(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('events');
    await P.duplicateItem(me, s(fd, 'id'));
    revalidatePath(`/admin/events/${s(fd, 'event_id')}`);
    return { ok: 'Copied — edit the copy if it should cover a different number.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function updatePotluckItem(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('events');
    await P.updateItem(me, s(fd, 'id'), {
      category: s(fd, 'category'),
      dish: s(fd, 'dish'),
      covers: Number(fd.get('covers') ?? 10),
      note: s(fd, 'note') || null,
    });
    revalidatePath(`/admin/events/${s(fd, 'event_id')}`);
    return { ok: 'Saved.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function removePotluckItem(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('events');
    await P.removeItem(me, s(fd, 'id'));
    revalidatePath(`/admin/events/${s(fd, 'event_id')}`);
    return { ok: 'Removed.' };
  } catch (e) { return { error: (e as Error).message }; }
}

// ───────────────────────── households ─────────────────────────

export async function inviteToHousehold(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await H.inviteToHousehold(me, s(fd, 'member_id'), s(fd, 'message') || null);
    revalidatePath('/portal/profile');
    return { ok: 'Asked. They will see it on their profile and get an email.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function respondToHouseholdInvite(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await H.respondToInvite(me, s(fd, 'id'), fd.get('accept') === '1');
    revalidatePath('/portal/profile');
    revalidatePath('/portal');
    return { ok: fd.get('accept') === '1' ? 'Linked.' : 'Declined.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function cancelHouseholdInvite(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await H.cancelInvite(me, s(fd, 'id'));
    revalidatePath('/portal/profile');
    return { ok: 'Withdrawn.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function leaveHousehold(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await H.leaveHousehold(me);
    revalidatePath('/portal/profile');
    return { ok: 'Unlinked. You each answer invitations for yourself now.' };
  } catch (e) { return { error: (e as Error).message }; }
}
