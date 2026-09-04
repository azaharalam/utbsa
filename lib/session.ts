import 'server-only';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import { randomToken, hashToken } from '@/lib/crypto';
import type { Member } from '@/lib/types';

const COOKIE = 'utbsa_session';
const DAYS = 30;

/**
 * Create a session and set the cookie.
 *
 * The cookie holds the raw token; the database holds only its SHA-256 hash.
 */
export async function createSession(memberId: string) {
  const token = randomToken();
  const expires = new Date(Date.now() + DAYS * 864e5);
  const h = headers();

  await sql`
    insert into sessions (token_hash, member_id, user_agent, ip, expires_at)
    values (${hashToken(token)}, ${memberId},
            ${h.get('user-agent') ?? null},
            ${h.get('x-forwarded-for')?.split(',')[0] ?? null},
            ${expires})
  `;

  cookies().set(COOKIE, token, {
    httpOnly: true,                                   // JavaScript cannot read it
    secure: process.env.NODE_ENV === 'production',    // HTTPS only in production
    sameSite: 'lax',                                  // survives normal navigation, blocks CSRF
    path: '/',
    expires,
  });
}

export async function destroySession() {
  const token = cookies().get(COOKIE)?.value;
  if (token) await sql`delete from sessions where token_hash = ${hashToken(token)}`;
  cookies().delete(COOKIE);
}

/** Sign every device out. Useful after a security scare. */
export async function destroyAllSessions(memberId: string) {
  await sql`delete from sessions where member_id = ${memberId}`;
}

/**
 * The signed-in member, or null.
 *
 * Wrapped in React's cache() so that a page hitting this five times across
 * its layout and components still runs one query per request.
 */
export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;

  const rows = await sql<Member[]>`
    select m.*
    from sessions s
    join members m on m.id = s.member_id
    where s.token_hash = ${hashToken(token)}
      and s.expires_at > now()
    limit 1
  `;

  return rows[0] ?? null;
});

/** Any signed-in member, whatever their status. Sends anonymous users to login. */
export async function requireMember(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) redirect('/auth/login');
  return member;
}

/** An approved member. Pending and rejected users are held on the waiting page. */
export async function requireApproved(): Promise<Member> {
  const member = await requireMember();
  if (member.status === 'pending' || member.status === 'rejected') redirect('/auth/pending');
  return member;
}

/**
 * An admin. This is the only place the check lives — never re-derive it from a
 * form field, a query parameter, or anything else the browser controls.
 */
export async function requireAdmin(): Promise<Member> {
  const member = await requireApproved();
  if (member.role !== 'admin') redirect('/portal');
  return member;
}

/** Housekeeping. Call from a cron job, or just occasionally. */
export async function purgeExpired() {
  await sql`delete from sessions where expires_at < now()`;
  await sql`delete from login_tokens where expires_at < now() - interval '1 day'`;
}
