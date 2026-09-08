import Link from 'next/link';
import { Card } from '@/components/ui';

export const metadata = { title: 'We have your details' };

export default function Thanks() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <Card>
        <h1 className="mb-3 font-display text-2xl font-bold">We have your details</h1>
        <p className="mb-4 text-sm text-ink-mid">
          Somebody will pick this up and email you to confirm who is meeting you and
          where. If your flight changes, reply to that email — do not submit the form
          again, or two people will turn up.
        </p>
        <p className="mb-4 text-sm text-ink-mid">
          If you have not heard from anyone three days before you fly, get in touch
          and we will chase it.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/contact" className="text-sm font-semibold text-kantha">Contact us</Link>
          <Link href="/join" className="text-sm font-semibold text-kantha">Join UTBSA</Link>
          <Link href="/" className="text-sm text-ink-mid">Home</Link>
        </div>
      </Card>
    </div>
  );
}
