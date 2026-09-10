import 'server-only';
import { sendMail } from '@/lib/mail';

/**
 * Sending to a hundred people at once.
 *
 * The naive loop — `for (const m of members) await sendMail(m)` — fails badly
 * on the fortieth address: the whole thing aborts, the sender sees an error,
 * and has no idea thirty-nine already went. They retry, those thirty-nine get
 * a second copy, and the daily quota burns twice.
 *
 * So: every recipient is attempted independently, failures are collected
 * rather than thrown, and a provider quota refusal stops the run cleanly with
 * a list of who has NOT been written to yet.
 */

export type BulkResult = {
  sent: string[];
  failed: { email: string; reason: string }[];
  notAttempted: string[];
  stoppedEarly: boolean;
  reason?: string;
};

/** Providers phrase this differently; all of them mean "stop". */
function isQuotaError(msg: string) {
  return /rate limit|too many|quota|429|daily limit|sending limit|throttl/i.test(msg);
}

/** A permanent problem with one address — no point retrying it. */
function isBadAddress(msg: string) {
  return /invalid|no such user|does not exist|550|blocked|unsubscrib|suppress/i.test(msg);
}

export async function sendBulk<T extends { email: string }>(
  recipients: T[],
  build: (r: T) => Promise<{ subject: string; text: string }> | { subject: string; text: string },
  opts: { pauseMs?: number } = {}
): Promise<BulkResult> {
  const result: BulkResult = { sent: [], failed: [], notAttempted: [], stoppedEarly: false };

  // A small gap between messages. Free tiers throttle per second as well as
  // per day, and a hundred sends in one burst is what trips it.
  const pause = opts.pauseMs ?? 120;

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];

    try {
      const message = await build(r);
      await sendMail({ to: r.email, ...message });
      result.sent.push(r.email);
    } catch (e) {
      const msg = (e as Error).message ?? String(e);

      if (isQuotaError(msg)) {
        // Everything after this would fail too. Stop, and say exactly who
        // still needs writing to so the rest can go tomorrow.
        result.stoppedEarly = true;
        result.reason = 'The email provider has refused further messages for now — '
                      + 'usually the daily limit.';
        result.notAttempted = recipients.slice(i).map((x) => x.email);
        return result;
      }

      result.failed.push({
        email: r.email,
        reason: isBadAddress(msg) ? 'That address was rejected' : msg.split('\n')[0],
      });
    }

    if (pause > 0 && i < recipients.length - 1) {
      await new Promise((res) => setTimeout(res, pause));
    }
  }

  return result;
}

/** A sentence a treasurer can act on, rather than a count that might be a lie. */
export function describeBulk(r: BulkResult, noun = 'member'): string {
  const plural = (n: number) => `${n} ${noun}${n === 1 ? '' : 's'}`;
  const parts: string[] = [`Sent to ${plural(r.sent.length)}.`];

  if (r.failed.length) {
    parts.push(`${plural(r.failed.length)} could not be reached: `
      + r.failed.slice(0, 3).map((f) => f.email).join(', ')
      + (r.failed.length > 3 ? `, and ${r.failed.length - 3} more` : '') + '.');
  }

  if (r.stoppedEarly) {
    parts.push(`Stopped before ${plural(r.notAttempted.length)}. ${r.reason} `
      + `Nobody was written to twice — send the rest tomorrow and only those `
      + `who were missed will get it.`);
  }

  return parts.join(' ');
}
