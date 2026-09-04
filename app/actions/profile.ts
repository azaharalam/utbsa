'use server';

import { revalidatePath } from 'next/cache';
import { requireApproved } from '@/lib/session';
import * as Members from '@/lib/queries/members';

export type FormState = { error?: string; ok?: string };

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? '').trim();
  return v === '' ? null : v;
};

export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireApproved();

  const full_name = str(fd, 'full_name');
  if (!full_name) return { error: 'Your name cannot be empty.' };

  const url = str(fd, 'linkedin_url');
  if (url && !/^https?:\/\//.test(url)) return { error: 'LinkedIn URL should start with https://' };

  const semester = str(fd, 'arrival_semester');
  const yearRaw = str(fd, 'arrival_year');
  const year = yearRaw ? Number(yearRaw) : null;

  if (year !== null && (!Number.isInteger(year) || year < 1990 || year > 2100)) {
    return { error: 'That arrival year does not look right.' };
  }
  // Half an answer is worse than none — it would sort oddly in the directory.
  if ((semester && !year) || (!semester && year)) {
    return { error: 'Pick both a semester and a year for when you arrived, or leave both blank.' };
  }

  try {
    // Note what is NOT read from this form: role, status, email. A member can
    // POST anything they like here; those fields are simply never consulted.
    await Members.updateSelf(me.id, {
      full_name,
      phone: str(fd, 'phone'),
      member_type: str(fd, 'member_type') ?? 'student',
      student_level: str(fd, 'student_level'),
      department: str(fd, 'department'),
      hometown_bd: str(fd, 'hometown_bd'),
      arrival_semester: semester,
      arrival_year: year,
      bio: str(fd, 'bio'),
      linkedin_url: url,
      emergency_contact_name: str(fd, 'emergency_contact_name'),
      emergency_contact_phone: str(fd, 'emergency_contact_phone'),
    });
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath('/portal');
  revalidatePath('/portal/profile');
  return { ok: 'Saved.' };
}

export async function updateVisibility(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireApproved();
  const on = (k: string) => fd.get(k) === 'on';

  await Members.updateVisibility(me.id, {
    show_email: on('show_email'),
    show_phone: on('show_phone'),
    show_photo: on('show_photo'),
    show_department: on('show_department'),
    show_hometown: on('show_hometown'),
    in_directory: on('in_directory'),
  });

  revalidatePath('/portal/profile');
  revalidatePath('/portal/directory');
  return { ok: 'Privacy settings saved.' };
}
