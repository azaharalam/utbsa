'use server';

import { revalidatePath } from 'next/cache';
import { requireApproved } from '@/lib/session';
import * as Members from '@/lib/queries/members';
import { isEmail, isUniversityEmail } from '@/lib/emails';

export type FormState = { error?: string; ok?: string };

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? '').trim();
  return v === '' ? null : v;
};

export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireApproved();

  const full_name = str(fd, 'full_name');
  if (!full_name) return { error: 'Your name cannot be empty.' };

  const personal = str(fd, 'personal_email');
  if (personal && !isEmail(personal)) return { error: 'That email address does not look right.' };
  if (personal && isUniversityEmail(personal)) {
    return { error: 'Use a non-university address here — it needs to outlive your degree.' };
  }

  const url = str(fd, 'linkedin_url');
  if (url && !/^https?:\/\//.test(url)) return { error: 'LinkedIn URL should start with https://' };

  try {
    // Note what is NOT read from this form: role, status, email. A member can
    // POST anything they like here; those fields are simply never consulted.
    await Members.updateSelf(me.id, {
      full_name,
      personal_email: personal,
      phone: str(fd, 'phone'),
      member_type: str(fd, 'member_type') ?? 'student',
      student_level: str(fd, 'student_level'),
      department: str(fd, 'department'),
      hometown_bd: str(fd, 'hometown_bd'),
      arrival_semester: str(fd, 'arrival_semester'),
      arrival_year: fd.get('arrival_year') ? Number(fd.get('arrival_year')) : null,
      bio: str(fd, 'bio'),
      linkedin_url: url,
      emergency_contact_name: str(fd, 'emergency_contact_name'),
      emergency_contact_phone: str(fd, 'emergency_contact_phone'),
    });
  } catch (e) {
    return { error: (e as Error).message };
  }

  // Adding a personal address may change where we write to.
  await Members.refreshContactEmail(me.id);

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
