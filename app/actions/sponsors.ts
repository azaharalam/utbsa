'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/session';
import { updateSponsor } from '@/lib/queries/sponsors';

export type FormState = { error?: string; ok?: string };

export async function saveSponsor(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('money');
    const str = (k: string) => String(fd.get(k) ?? '').trim() || null;

    await updateSponsor(me, String(fd.get('id')), {
      showPublicly: fd.get('show_publicly') === 'on',
      publicName: str('public_name'),
      website: str('website'),
      blurb: str('blurb'),
    });

    revalidatePath('/admin/sponsors');
    revalidatePath('/sponsors');
    return { ok: 'Saved.' };
  } catch (e) { return { error: (e as Error).message }; }
}
