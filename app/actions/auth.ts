'use server';

import { redirect } from 'next/navigation';
import * as Members from '@/lib/queries/members';
import * as Tokens from '@/lib/queries/tokens';
import { sendMail, magicLinkEmail } from '@/lib/mail';
import { destroySession } from '@/lib/session';
import { audit } from '@/lib/audit';

export type FormState = { error?: string; ok?: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function signUp(_prev: FormState, fd: FormData): Promise<FormState> {
  const full_name = String(fd.get('full_name') ?? '').trim();
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const phone = String(fd.get('phone') ?? '').trim() || null;
  const heard_from = String(fd.get('heard_from') ?? '').trim() || null;

  if (full_name.length < 2) return { error: 'Please enter your full name.' };
  if (!EMAIL_RE.test(email)) return { error: 'That email address does not look right.' };
  if (await Tokens.tooManyRecent(email)) {
    return { error: 'Too many requests for this address. Try again in an hour.' };
  }

  const existing = await Members.findByEmail(email);
  if (!existing) {
    const member = await Members.createPending({ full_name, email, phone, heard_from });
    await audit(null, 'member.signup', 'member', member.id, { email });
  }

  // Same response whether or not the account already existed — otherwise this
  // form becomes a way to test which addresses are registered.
  const token = await Tokens.issueToken(email, 'signup');
  const mail = magicLinkEmail(token, true);
  await sendMail({ to: email, ...mail });

  redirect(`/auth/check-email?email=${encodeURIComponent(email)}&new=1`);
}

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: 'Enter the email address you signed up with.' };

  if (await Tokens.tooManyRecent(email)) {
    return { error: 'Too many requests for this address. Try again in an hour.' };
  }

  const member = await Members.findByEmail(email);
  if (member) {
    const token = await Tokens.issueToken(email, 'login');
    const mail = magicLinkEmail(token, false);
    await sendMail({ to: email, ...mail });
  }
  // No branch in the response. An attacker learns nothing either way.

  redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
}

export async function signOut() {
  await destroySession();
  redirect('/');
}
