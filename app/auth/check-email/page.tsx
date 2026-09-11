import Link from 'next/link';
import { Card } from '@/components/ui';

export const metadata = { title: 'Check your email' };

/**
 * Shown after requesting a sign-in link, whether or not an account exists.
 *
 * The ambiguity is deliberate: telling someone "no account with that address"
 * turns this form into a way of discovering who is a member. But the old
 * wording — "We sent a link to aa@yopmail.com" — was a flat claim that is
 * often untrue, and left someone who simply has not joined yet staring at a
 * page with nowhere to go.
 *
 * So: say what happens in both cases honestly, and offer the way forward.
 */
export default function CheckEmail({
  searchParams,
}: {
  searchParams: { email?: string; new?: string };
}) {
  const isNew = searchParams.new === '1';
  const address = searchParams.email;

  if (isNew) {
    return (
      <Card>
        <h1 className="mb-2 font-display text-2xl font-bold">Check your email</h1>
        <p className="mb-4 text-sm text-ink-mid">
          We sent a confirmation link to{' '}
          <span className="font-semibold text-ink">{address ?? 'your inbox'}</span>.
          It works once and expires in 30 minutes.
        </p>
        <p className="mb-4 rounded-lg border-2 border-dashed border-kantha bg-kantha-pale px-4 py-3 text-sm">
          After you confirm, an e-board member reviews your request. You will get a
          second email once you are approved — usually within a day.
        </p>
        <p className="text-sm text-ink-mid">
          Nothing after a few minutes? Look in spam — we are a new domain, and if you
          find it there, marking it <strong>not spam</strong> helps everyone who joins
          after you. Then{' '}
          <Link href="/join" className="font-semibold text-kantha">try again</Link>.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="mb-2 font-display text-2xl font-bold">Check your email</h1>

      <p className="mb-4 text-sm text-ink-mid">
        If there is a UTBSA account for{' '}
        <span className="font-semibold text-ink">{address ?? 'that address'}</span>,
        a sign-in link is on its way. It works once and expires in 30 minutes.
      </p>

      <p className="mb-5 text-sm text-ink-mid">
        Nothing after a few minutes? Look in spam — we are a new domain, and marking
        it <strong>not spam</strong> helps everyone else too.
      </p>

      <hr className="stitch mb-5 border-0" />

      <h2 className="mb-1 font-display text-base font-bold">Not a member yet?</h2>
      <p className="mb-4 text-sm text-ink-mid">
        Then no email is coming — there is no account to sign in to. Anyone is
        welcome to join, and you do not have to be Bangladeshi.
      </p>

      <div className="flex flex-wrap gap-2">
        <Link href="/join"
          className="inline-flex min-h-[44px] items-center rounded-lg bg-kantha px-4 text-sm font-semibold text-white">
          Join UTBSA
        </Link>
        <Link href="/auth/login"
          className="inline-flex min-h-[44px] items-center rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
          Try another address
        </Link>
        <Link href="/contact"
          className="inline-flex min-h-[44px] items-center px-2 text-sm font-semibold text-kantha">
          Contact us
        </Link>
        <Link href="/"
          className="inline-flex min-h-[44px] items-center px-2 text-sm text-ink-mid">
          Home
        </Link>
      </div>

      <p className="mt-5 text-xs text-ink-mid">
        Signed up but never approved? Sign in anyway — you will be told where your
        request stands.
      </p>
    </Card>
  );
}
