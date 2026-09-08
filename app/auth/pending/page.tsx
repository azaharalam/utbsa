import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/session';
import { Card } from '@/components/ui';
import SignOutButton from '@/components/sign-out';
import Appeal from './appeal';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Waiting for approval' };

export default async function Pending() {
  const me = await requireMember();
  if (me.status !== 'pending' && me.status !== 'rejected') redirect('/portal');

  if (me.status === 'rejected') {
    return (
      <Card>
        <h1 className="mb-2 font-display text-2xl font-bold">Your request was not approved</h1>
        {me.rejected_reason && (
          <div className="mb-4 rounded-lg border-2 border-dashed border-stitch bg-muslin p-3">
            <p className="text-xs font-semibold text-ink-mid">The reason given</p>
            <p className="text-sm">{me.rejected_reason}</p>
          </div>
        )}

        <p className="mb-4 text-sm text-ink-mid">
          Your account still exists and you can sign in with this address whenever you
          like — nothing has been deleted. If you think a mistake was made, or
          something has changed, tell us and somebody will look at it again.
        </p>

        <div className="mb-4">
          <Appeal />
        </div>

        <p className="mb-4 text-xs text-ink-mid">
          You can also{' '}
          <Link href="/contact" className="font-semibold text-kantha">use the contact form</Link>,
          or email the e-board directly. UTBSA events that are open to the public are
          still open to you.
        </p>

        <SignOutButton />
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="mb-2 font-display text-2xl font-bold">You are on the list</h1>
      <p className="mb-4 text-sm text-ink-mid">
        Thanks, {me.full_name.split(' ')[0]}. Your email is confirmed and an e-board member will
        approve you shortly — usually within a day. We will email you the moment it happens.
      </p>
      <p className="mb-4 text-sm text-ink-mid">
        In the meantime, have a look at <Link href="/events" className="font-semibold text-kantha">what is coming up</Link>.
      </p>
      <SignOutButton />
    </Card>
  );
}
