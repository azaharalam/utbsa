'use server';

import { headers } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import * as Content from '@/lib/queries/content';
import { sql } from '@/lib/db';
import { scoreMessage, SPAM_THRESHOLD, formTooFast } from '@/lib/spam';

export type FormState = { error?: string; ok?: string };

/** Behind nginx the socket address is 127.0.0.1, so read the forwarded header. */
function senderIp(): string | null {
  const h = headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? h.get('x-real-ip')
    ?? null;
}

/**
 * A signed timestamp the form carries.
 *
 * Signed so it cannot be back-dated: without a signature a script would just
 * send a plausible-looking older time, and the check would be decoration.
 */
export async function formStamp(): Promise<string> {
  const now = Date.now().toString();
  const mac = createHmac('sha256', process.env.SESSION_SECRET ?? 'dev')
    .update(now).digest('hex').slice(0, 16);
  return `${now}.${mac}`;
}

function readStamp(raw: string | null): number | null {
  if (!raw) return null;
  const [ts, mac] = raw.split('.');
  if (!ts || !mac) return null;
  const expected = createHmac('sha256', process.env.SESSION_SECRET ?? 'dev')
    .update(ts).digest('hex').slice(0, 16);
  try {
    if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  } catch { return null; }
  return Number(ts) || null;
}

export async function sendMessage(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = String(fd.get('name') ?? '').trim();
  const email = String(fd.get('email') ?? '').trim();
  const message = String(fd.get('message') ?? '').trim();
  const subject = String(fd.get('subject') ?? '').trim() || null;

  // Honeypot: a hidden field real people never fill in. Catches crude bots,
  // and nothing that parses the form properly — which the SEO pitches do.
  //
  // It answers "sent" rather than refusing, so a bot learns nothing.
  if (String(fd.get('website') ?? '')) return { ok: 'Message sent.' };

  // Nobody types a message in under two and a half seconds.
  if (formTooFast(readStamp(String(fd.get('_t') ?? '') || null))) {
    return { ok: 'Message sent.' };
  }

  if (!name || !email || !message) return { error: 'Name, email, and message are all needed.' };
  if (message.length > 5000) return { error: 'That message is too long.' };

  const ip = senderIp();

  // Three an hour from one address is plenty for anybody with a real
  // question, and it stops a script filling the inbox overnight.
  if (ip) {
    const [{ n }] = await sql<{ n: string }[]>`
      select count(*)::text n from contact_messages
      where sender_ip = ${ip} and created_at > now() - interval '1 hour'
    `;
    if (Number(n) >= 3) {
      return { error: 'That is a few messages in a short time. Please try again later, '
                    + 'or email us directly.' };
    }
  }

  const { score, reasons } = scoreMessage({ name, email, subject, message });

  await Content.saveMessage({
    name, email, message, subject,
    spamScore: score,
    spamReasons: reasons.length ? reasons.join(', ') : null,
    senderIp: ip,
  });

  // The same answer either way. Telling a sender their message was filed as
  // spam simply teaches them which words to avoid.
  return score >= SPAM_THRESHOLD
    ? { ok: 'Message sent.' }
    : { ok: 'Message sent. Someone from the e-board will reply within a couple of days.' };
}
