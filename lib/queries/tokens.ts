import 'server-only';
import { sql } from '@/lib/db';
import { randomToken, hashToken } from '@/lib/crypto';

const TTL_MINUTES = 30;
const MAX_PER_HOUR = 5;

/**
 * Rate limit magic-link requests per email address.
 *
 * Without this, anyone can use your signup form to send unlimited email to
 * a stranger's inbox — and burn through your provider's quota doing it.
 */
export async function tooManyRecent(email: string) {
  const [{ n }] = await sql<{ n: string }[]>`
    select count(*)::text as n from login_tokens
    where lower(email) = lower(${email}) and created_at > now() - interval '1 hour'
  `;
  return Number(n) >= MAX_PER_HOUR;
}

export async function issueToken(email: string, purpose: 'login' | 'signup') {
  const token = randomToken();
  await sql`
    insert into login_tokens (token_hash, email, purpose, expires_at)
    values (${hashToken(token)}, ${email.toLowerCase()}, ${purpose},
            now() + make_interval(mins => ${TTL_MINUTES}))
  `;
  return token;
}

/**
 * Consume a token. Single use: the UPDATE only matches rows that are unused
 * and unexpired, so a replayed link returns null. Doing the check and the
 * write in one statement means two simultaneous requests cannot both win.
 */
export async function consumeToken(token: string) {
  const rows = await sql<{ email: string; purpose: string }[]>`
    update login_tokens
    set consumed_at = now()
    where token_hash = ${hashToken(token)}
      and consumed_at is null
      and expires_at > now()
    returning email, purpose
  `;
  return rows[0] ?? null;
}
