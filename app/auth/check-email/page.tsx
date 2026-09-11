import Link from 'next/link';
import { Card, Button } from '@/components/ui';

export const metadata = { title: 'Check your email' };

/**
 * Four outcomes, each said plainly. The old page showed one paragraph for all
 * of them and left people guessing.
 */
export default function CheckEmail({
  searchParams,
}: {
  searchParams: { state?: string; email?: string; typed?: string; new?: string };
}) {
  const { state, email, typed } = searchParams;

  // ── just signed up ──────────────────────────────────────────
  if (searchParams.new === '1' || state === 'signup') {
    return (
      <Card>
        <h1 className="mb-2 font-display text-2xl font-bold">Check your email</h1>
        <p className="mb-4 text-sm text-ink-mid">
          We sent a confirmation link to{' '}
          <span className="font-semibold text-ink">{email ?? 'your inbox'}</span>. Open it
          to confirm your address.
        </p>
        <p className="mb-4 rounded-lg border-2 border-dashed border-kantha bg-kantha-pale px-4 py-3 text-sm">
          After that, an e-board member reviews your request. You will get a second email
          once you are approved — usually within a day.
        </p>
        <p className="text-xs text-ink-mid">
          Not there? Look in spam, and mark it <strong>not spam</strong> if you find it —
          it helps everyone who joins after you.
        </p>
      </Card>
    );
  }

  // ── no account with that address ────────────────────────────
  if (state === 'nomember') {
    return (
      <Card>
        <h1 className="mb-2 font-display text-2xl font-bold">
          We do not have an account for that address
        </h1>
        <p className="mb-5 text-sm text-ink-mid">
          No email is on its way, because there is nothing to sign in to yet. If you have
          not joined, you are welcome to — and you do not have to be Bangladeshi.
        </p>

        <div className="mb-5 flex flex-wrap gap-2">
          <Link href="/join">
            <Button>Join UTBSA</Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="ghost">Try another address</Button>
          </Link>
        </div>

        <hr className="stitch mb-4 border-0" />

        <p className="text-sm text-ink-mid">
          Sure you are a member? You may have signed up with a different address — try
          your other one. Otherwise{' '}
          <Link href="/contact" className="font-semibold text-kantha">tell us</Link>{' '}
          and we will sort it out, or go back{' '}
          <Link href="/" className="font-semibold text-kantha">home</Link>.
        </p>
      </Card>
    );
  }

  // ── member, but they typed their university address ─────────
  if (state === 'redirected') {
    return (
      <Card>
        <h1 className="mb-2 font-display text-2xl font-bold">Check your personal email</h1>

        <p className="mb-4 text-sm text-ink-mid">
          We sent the link to{' '}
          <span className="font-semibold text-ink">{email ?? 'your personal address'}</span>
          {typed && <> — not to {typed}</>}.
        </p>

        <p className="text-xs text-ink-mid">
          Wrong address? Change it under{' '}
          <Link href="/portal/profile" className="font-semibold text-kantha">My profile</Link>{' '}
          once you are in, or{' '}
          <Link href="/contact" className="font-semibold text-kantha">tell us</Link>.
        </p>
      </Card>
    );
  }

  // ── the ordinary case ───────────────────────────────────────
  return (
    <Card>
      <h1 className="mb-2 font-display text-2xl font-bold">Check your email</h1>
      <p className="mb-4 text-sm text-ink-mid">
        We sent a sign-in link to{' '}
        <span className="font-semibold text-ink">{email ?? 'your inbox'}</span>. Open it and
        you are in. It works once and expires in 30 minutes.
      </p>
      <p className="text-xs text-ink-mid">
        Not there after a minute? Look in spam, and mark it <strong>not spam</strong> if you
        find it — that helps everyone. Or{' '}
        <Link href="/auth/login" className="font-semibold text-kantha">try again</Link>.
      </p>
    </Card>
  );
}
