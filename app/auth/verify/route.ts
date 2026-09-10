import { NextResponse, type NextRequest } from 'next/server';
import * as Tokens from '@/lib/queries/tokens';
import * as Members from '@/lib/queries/members';
import { createSession } from '@/lib/session';
import { audit } from '@/lib/audit';

/**
 * Where to send the browser after handling the token.
 *
 * NOT request.nextUrl.origin. Behind nginx the app sees the request arriving
 * at 127.0.0.1:3001, so every redirect built from `origin` points at
 * localhost — the person clicks their sign-in link, gets bounced to an
 * address that does not exist, and the token is already spent.
 *
 * NEXT_PUBLIC_SITE_URL is the address the site is actually reached at, which
 * is the only thing that can be right here. The X-Forwarded-* headers are the
 * fallback, and `origin` only as a last resort for local development.
 */
function base(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;

  return request.nextUrl.origin;
}

/**
 * The magic link lands here.
 *
 * A GET that changes state is normally poor practice, but it is unavoidable
 * for email links. The token is single-use and short-lived, which is what
 * makes it acceptable.
 */
export async function GET(request: NextRequest) {
  const site = base(request);
  const token = request.nextUrl.searchParams.get('token');

  if (!token) return NextResponse.redirect(`${site}/auth/login?error=missing`);

  const consumed = await Tokens.consumeToken(token);
  if (!consumed) return NextResponse.redirect(`${site}/auth/login?error=expired`);

  // findByEmail matches any of the member's addresses.
  const member = await Members.findByEmail(consumed.email);
  if (!member) return NextResponse.redirect(`${site}/auth/login?error=nouser`);

  await Members.markEmailVerified(member.id);
  await Members.touchLastSeen(member.id);
  await createSession(member.id);
  await audit(member.id, 'auth.login');

  const dest =
    member.status === 'pending' || member.status === 'rejected' ? '/auth/pending' : '/portal';

  return NextResponse.redirect(`${site}${dest}`);
}
