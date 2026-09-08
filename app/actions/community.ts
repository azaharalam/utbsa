'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireApproved, requirePermission } from '@/lib/session';
import * as C from '@/lib/queries/community';
import { parseAmount } from '@/lib/money';
import { sendMail } from '@/lib/mail';
import { getSettings } from '@/lib/queries/settings';

export type FormState = { error?: string; ok?: string };

const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const n = (fd: FormData, k: string) => s(fd, k) || null;
const on = (fd: FormData, k: string) => fd.get(k) === 'on';

// ───────────────────────── arrivals ─────────────────────────

/** Public — submitted by people who have no account yet. */
export async function submitArrival(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    if (s(fd, 'website')) return { ok: 'Thanks.' };   // honeypot

    await C.submitArrival({
      fullName: s(fd, 'full_name'),
      email: s(fd, 'email'),
      phone: n(fd, 'phone'),
      arrivingOn: s(fd, 'arriving_on'),
      arrivingAt: n(fd, 'arriving_at'),
      airport: n(fd, 'airport') ?? 'DTW',
      flightNo: n(fd, 'flight_no'),
      peopleCount: Number(fd.get('people_count') ?? 1),
      luggageNote: n(fd, 'luggage_note'),
      needsPickup: on(fd, 'needs_pickup'),
      needsStay: on(fd, 'needs_stay'),
      needsShopping: on(fd, 'needs_shopping'),
      program: n(fd, 'program'),
      department: n(fd, 'department'),
      note: n(fd, 'note'),
    });
  } catch (e) { return { error: (e as Error).message }; }

  redirect('/arrive/thanks');
}

export async function claimArrival(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await C.claimArrival(me, s(fd, 'id'));
    revalidatePath('/portal/arrivals');
    return { ok: "You've got it. Their flight details are on the card now." };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function releaseArrival(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await C.releaseArrival(me, s(fd, 'id'));
    revalidatePath('/portal/arrivals');
    return { ok: 'Released — someone else can pick it up.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function closeArrival(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await C.closeArrival(me, s(fd, 'id'), s(fd, 'note'), fd.get('cancelled') === '1');
    revalidatePath('/portal/arrivals');
    revalidatePath('/admin/arrivals');
    return { ok: 'Closed.' };
  } catch (e) { return { error: (e as Error).message }; }
}

/** An officer putting someone's name against an arrival. */
export async function assignArrival(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('members');
    await C.assignArrival(me, s(fd, 'id'), s(fd, 'member_id'));
    revalidatePath('/admin/arrivals');
    revalidatePath('/portal/arrivals');
    return { ok: 'Assigned, and they have been emailed.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function unassignArrival(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('members');
    await C.unassignArrival(me, s(fd, 'id'));
    revalidatePath('/admin/arrivals');
    revalidatePath('/portal/arrivals');
    return { ok: 'Back on the open board.' };
  } catch (e) { return { error: (e as Error).message }; }
}

// ───────────────────────── giveaway ─────────────────────────

export async function postGiveaway(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    const price = s(fd, 'price') ? parseAmount(s(fd, 'price')) : 0;
    await C.postGiveaway(me, {
      title: s(fd, 'title'),
      description: n(fd, 'description'),
      category: s(fd, 'category') || 'other',
      condition: n(fd, 'condition') ?? 'good',
      priceCents: price ?? 0,
    });
    revalidatePath('/portal/giveaway');
    return { ok: 'Listed.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function claimGiveaway(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await C.claimGiveaway(me, s(fd, 'id'));
    revalidatePath('/portal/giveaway');
    return { ok: 'Yours — message them to arrange collection.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function setGiveawayStatus(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await C.setGiveawayStatus(me, s(fd, 'id'), s(fd, 'status'));
    revalidatePath('/portal/giveaway');
    return { ok: 'Updated.' };
  } catch (e) { return { error: (e as Error).message }; }
}

// ───────────────────────── housing ─────────────────────────

export async function postHousing(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    const rent = s(fd, 'rent') ? parseAmount(s(fd, 'rent')) : null;
    await C.postHousing(me, {
      kind: s(fd, 'kind') || 'seeking',
      title: s(fd, 'title'),
      area: n(fd, 'area'),
      rentCents: rent,
      availableFrom: n(fd, 'available_from'),
      description: n(fd, 'description'),
    });
    revalidatePath('/portal/housing');
    return { ok: 'Posted.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function closeHousing(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await C.closeHousing(me, s(fd, 'id'));
    revalidatePath('/portal/housing');
    return { ok: 'Taken down.' };
  } catch (e) { return { error: (e as Error).message }; }
}

// ───────────────────────── jobs ─────────────────────────

export async function postJob(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await C.postJob(me, {
      title: s(fd, 'title'),
      organisation: s(fd, 'organisation'),
      location: n(fd, 'location'),
      kind: s(fd, 'kind') || 'full_time',
      link: n(fd, 'link'),
      description: n(fd, 'description'),
      closesOn: n(fd, 'closes_on'),
    });
    revalidatePath('/portal/jobs');
    return { ok: 'Posted.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function closeJob(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await C.closeJob(me, s(fd, 'id'));
    revalidatePath('/portal/jobs');
    return { ok: 'Taken down.' };
  } catch (e) { return { error: (e as Error).message }; }
}
