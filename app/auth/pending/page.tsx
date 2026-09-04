import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/session';
import { Card } from '@/components/ui';
import SignOutButton from '@/components/sign-out';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Waiting for approval' };

export default async function Pending() {
  const me = await requireMember();
  if (me.status !== 'pending' && me.status !== 'rejected') redirect('/portal');

  if (me.status === 'rejected') {
    return (
      <Card>
        <h1 className="mb-2 font-display text-2xl font-bold">Your request was not approved</h1>
        <p className="mb-4 text-sm text-ink-mid">{me.rejected_reason}</p>
        <p className="mb-4 text-sm text-ink-mid">
          If you think this is a mistake, <Link href="/contact" className="font-semibold text-kantha">get in touch</Link>{' '}
          and we will take another look.
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
