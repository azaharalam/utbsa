'use server';

import { redirect } from 'next/navigation';
import * as Members from '@/lib/queries/members';
import * as Tokens from '@/lib/queries/tokens';
import { sendMail, magicLinkEmail } from '@/lib/mail';

/**
 * a•••r@gmail.com — enough for someone to recognise their own address,
 * not enough to hand a stranger a working one.
 */
function maskEmail(e: string): string {
  const [local, domain] = e.split('@');
  if (!domain) return e;
  const shown = local.length <= 2 ? local[0] : local[0] + '•••' + local.slice(-1);
  return `${shown}@${domain}`;
}
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

  // The personal address, always. It used to be the university one for
  // students, which is where this broke: UToledo quarantines mail from a
  // domain it does not recognise, so the confirmation never arrived and the
  // person could not finish signing up. Approval and sign-in worked, because
  // both use members.email, which migration 019 set to the personal address.
  //
  // Same rule as contactEmail(). The university address still identifies them
  // and still signs them in; we just do not write to it.
  const primary = personal || university;

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
  try {
    await sendMail({ to: primary, ...magicLinkEmail(token, true) });
  } catch (e) {
    console.error('signup email failed:', (e as Error).message);
    return { error: 'Your details are saved, but we could not send the confirmation email. Please try signing in shortly.' };
  }

  redirect(`/auth/check-email?state=signup&email=${encodeURIComponent(maskEmail(primary))}`);
}

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  if (!isEmail(email)) return { error: 'Enter the email address you signed up with.' };

  if (await Tokens.tooManyRecent(email)) {
    return { error: 'Too many requests for this address. Try again in an hour.' };
  }

  // Either address signs you in. This is what makes graduation a non-event.
  const member = await Members.findByEmail(email);

  if (!member) {
    redirect('/auth/check-email?state=nomember');
  }

  // Send to the address we can actually REACH, not the one they typed.
  //
  // The university quarantines mail from a domain it has not seen before, so
  // a link sent to @rockets.utoledo.edu never arrives. Someone typing their
  // university address would sit waiting for an email that was silently
  // binned. Send it to their personal address and say plainly that we did.
  //
  // Decided from the ADDRESS, not from members.email. That column is supposed
  // to hold the personal address after migration 019, but a record predating
  // it — or one edited by hand — would still hold the university one, and
  // then we would silently send to the quarantined address while telling the
  // person it was on its way.
  // Same rule as contactEmail(): the personal address, for everyone.
  // Not members.email — that column should hold it after migration 019, but a
  // record predating the migration, or edited by hand, would still hold the
  // university address, and we would send into the quarantine while telling
  // the person their link was on its way.
  const deliverTo = member.personal_email ?? member.email;
  const redirected = deliverTo.toLowerCase() !== email;

  const token = await Tokens.issueToken(deliverTo, 'login');
  try {
    await sendMail({ to: deliverTo, ...magicLinkEmail(token, false) });
  } catch (e) {
    // A mail failure must not take the page down. The token is already
    // issued, so the person can try again — and we log the real reason
    // rather than leaving a 504 and a blank screen.
    console.error('sign-in email failed:', (e as Error).message);
    return { error: 'We could not send the email just now. Please try again in a moment.' };
  }

  redirect(`/auth/check-email?state=${redirected ? 'redirected' : 'sent'}`
    + `&email=${encodeURIComponent(maskEmail(deliverTo))}`
    + (redirected ? `&typed=${encodeURIComponent(maskEmail(email))}` : ''));
}

export async function signOut() {
  await destroySession();
  redirect('/');
}
