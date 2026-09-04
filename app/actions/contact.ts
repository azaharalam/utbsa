'use server';

import * as Content from '@/lib/queries/content';

export type FormState = { error?: string; ok?: string };

export async function sendMessage(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = String(fd.get('name') ?? '').trim();
  const email = String(fd.get('email') ?? '').trim();
  const message = String(fd.get('message') ?? '').trim();

  // Honeypot: a hidden field real people never fill in.
  if (String(fd.get('website') ?? '')) return { ok: 'Message sent.' };

  if (!name || !email || !message) return { error: 'Name, email, and message are all needed.' };
  if (message.length > 5000) return { error: 'That message is too long.' };

  await Content.saveMessage({
    name, email, message,
    subject: String(fd.get('subject') ?? '').trim() || null,
  });

  return { ok: 'Message sent. Someone from the e-board will reply within a couple of days.' };
}
