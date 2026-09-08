'use server';

import { redirect } from 'next/navigation';
import * as Members from '@/lib/queries/members';
import * as Tokens from '@/lib/queries/tokens';
import { sendMail, magicLinkEmail } from '@/lib/mail';
import { destroySession } from '@/lib/session';
import { audit } from '@/lib/audit';
import {
  isEmail, isUniversityEmail, needsUniversityEmail,
  MEMBER_TYPE_FOR, type JoiningAs,
} from '@/lib/emails';

export type FormState = { error?: string; ok?: string };

export async function signUp(_prev: FormState, fd: FormData): Promise<FormState> {
  const full_name = String(fd.get('full_name') ?? '').trim();
  const joiningAs = (String(fd.get('joining_as') ?? 'student')) as JoiningAs;
  const university = String(fd.get('university_email') ?? '').trim().toLowerCase();
  const personal = String(fd.get('personal_email') ?? '').trim().toLowerCase();
  const phone = String(fd.get('phone') ?? '').trim() || null;
  const heard_from = String(fd.get('heard_from') ?? '').trim() || null;

  if (full_name.length < 2) return { error: 'Please enter your full name.' };

  if (needsUniversityEmail(joiningAs)) {
    // Requiring the university address at signup is what proves someone
    // actually belongs to UToledo, rather than taking their word for it.
    if (!university) return { error: 'Your UToledo address is required.' };
    if (!isUniversityEmail(university)) {
      return { error: 'That does not look like a UToledo address. It should end in utoledo.edu.' };
    }
    // And the personal one is what still reaches them after they graduate.
    if (!personal) {
      return { error: joiningAs === 'alumni'
        ? 'A personal address is required — your UToledo one has probably stopped working.'
        : 'A personal address is required. Your UToledo one stops working when you graduate.' };
    }
    if (!isEmail(personal)) return { error: 'That personal address does not look right.' };
    if (isUniversityEmail(personal)) {
      return { error: 'Use a non-university address for the personal one — Gmail, Outlook, anything that outlives your degree.' };
    }
  } else {
    if (!personal) return { error: 'An email address is required.' };
    if (!isEmail(personal)) return { error: 'That email address does not look right.' };
  }

  const primary = joiningAs === 'student' ? university : personal;

  if (await Tokens.tooManyRecent(primary)) {
    return { error: 'Too many requests for this address. Try again in an hour.' };
  }

  const existing = await Members.findByEmail(primary)
    ?? (personal ? await Members.findByEmail(personal) : null)
    ?? (university ? await Members.findByEmail(university) : null);

  if (!existing) {
    try {
      const member = await Members.createPending({
        full_name,
        member_type: MEMBER_TYPE_FOR[joiningAs],
        university_email: university || null,
        personal_email: personal || null,
        phone, heard_from,
      });
      await audit(null, 'member.signup', 'member', member.id);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('members_university_email_idx') || msg.includes('members_personal_email_idx')
          || msg.includes('members_email_key')) {
        // Fall through — the same non-committal response as an existing account.
      } else {
        return { error: msg };
      }
    }
  }

  // Same response whether or not the account existed. Otherwise this form
  // becomes a way to test which addresses are registered.
  const token = await Tokens.issueToken(primary, 'signup');
  await sendMail({ to: primary, ...magicLinkEmail(token, true) });

  redirect(`/auth/check-email?email=${encodeURIComponent(primary)}&new=1`);
}

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  if (!isEmail(email)) return { error: 'Enter the email address you signed up with.' };

  if (await Tokens.tooManyRecent(email)) {
    return { error: 'Too many requests for this address. Try again in an hour.' };
  }

  // Either address works. This is what makes graduation a non-event.
  const member = await Members.findByEmail(email);
  if (member) {
    const token = await Tokens.issueToken(email, 'login');
    await sendMail({ to: email, ...magicLinkEmail(token, false) });
  }
  // No branch in the response — an attacker learns nothing either way.

  redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
}

export async function signOut() {
  await destroySession();
  redirect('/');
}
