'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/session';
import { addOfficer } from '@/lib/queries/content';
import { audit } from '@/lib/audit';

export type FormState = { error?: string; ok?: string };

export async function addOfficerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const memberId = String(fd.get('member_id') ?? '');
    const title = String(fd.get('title') ?? '').trim();
    if (!memberId || !title) return { error: 'Pick a member and a title.' };

    await addOfficer(me, memberId, title, Number(fd.get('sort_order') ?? 1));
    await audit(me.id, 'officer.add', 'member', memberId, { title });

    revalidatePath('/admin/eboard');
    revalidatePath('/eboard');
    return { ok: 'Added.' };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
