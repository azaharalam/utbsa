import { NextResponse, type NextRequest } from 'next/server';
import * as Tokens from '@/lib/queries/tokens';
import * as Members from '@/lib/queries/members';
import { createSession } from '@/lib/session';
import { audit } from '@/lib/audit';

/**
 * The magic link lands here.
 *
 * A GET that changes state is normally poor practice, but it is unavoidable
 * for email links. The token is single-use and short-lived, which is what
 * makes it acceptable.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token = searchParams.get('token');

  if (!token) return NextResponse.redirect(`${origin}/auth/login?error=missing`);

  const consumed = await Tokens.consumeToken(token);
  if (!consumed) return NextResponse.redirect(`${origin}/auth/login?error=expired`);

  // findByEmail matches any of the member's addresses.
  const member = await Members.findByEmail(consumed.email);
  if (!member) return NextResponse.redirect(`${origin}/auth/login?error=nouser`);

  await Members.markEmailVerified(member.id);
  await Members.touchLastSeen(member.id);
  await createSession(member.id);
  await audit(member.id, 'auth.login');

  const dest =
    member.status === 'pending' || member.status === 'rejected' ? '/auth/pending' : '/portal';

  return NextResponse.redirect(`${origin}${dest}`);
}
