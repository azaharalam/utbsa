import Link from 'next/link';
import { Card } from '@/components/ui';

export const metadata = { title: 'Check your email' };

export default function CheckEmail({ searchParams }: { searchParams: { email?: string; new?: string } }) {
  const isNew = searchParams.new === '1';
  return (
    <Card>
      <h1 className="mb-2 font-display text-2xl font-bold">Check your email</h1>
      <p className="mb-4 text-sm text-ink-mid">
        We sent a link to <span className="font-semibold text-ink">{searchParams.email ?? 'your inbox'}</span>.
        It works once and expires in 30 minutes.
      </p>
      {isNew && (
        <p className="mb-4 rounded-lg border-2 border-dashed border-kantha bg-kantha-pale px-4 py-3 text-sm">
          After you confirm, an e-board member reviews your request. You will get a second email
          once you are approved — usually within a day.
        </p>
      )}
      <p className="text-sm text-ink-mid">
        Nothing arrived after a few minutes? Check spam, then{' '}
        <Link href="/auth/login" className="font-semibold text-kantha">try again</Link>.
      </p>
      <p className="mt-4 rounded-lg bg-muslin-deep px-3 py-2 text-xs text-ink-mid">
        Running locally with <code>MAIL_TRANSPORT=console</code>? The link is printed in the
        terminal where <code>npm run dev</code> is running.
      </p>
    </Card>
  );
}
