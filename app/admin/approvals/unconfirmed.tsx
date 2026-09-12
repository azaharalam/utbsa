'use client';

import { useFormState } from 'react-dom';
import { Card, Button, Notice, Pill } from '@/components/ui';
import { Confirmation } from '@/components/money/form-result';
import { resendConfirmation } from '@/app/actions/admin';
import type { Member } from '@/lib/types';

/**
 * Signed up, never opened the confirmation link.
 *
 * Not in the approval queue, because approving somebody who has not proved
 * they can read that address sends the approval into a void. But shown here,
 * because the alternative is that a mistyped address makes a person vanish
 * and nobody notices until they ask in person.
 */
export default function Unconfirmed({ people }: { people: Member[] }) {
  const [state, resend] = useFormState(resendConfirmation, {});
  if (!people.length) return null;

  return (
    <Card className="mt-8">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Waiting to confirm</h2>
        <Pill tone="gold">{people.length}</Pill>
      </div>
      <p className="mb-4 text-sm text-ink-mid">
        These people signed up but have not opened the link we sent. They are not in the
        queue above until they do. If one of them is standing in front of you, the usual
        cause is a mistyped address, and the fix is to correct it on their record first.
      </p>

      {state?.error && <Notice tone="error">{state?.error}</Notice>}
      <Confirmation message={state?.ok} />

      <ul className="divide-y divide-[#EFE9DC]">
        {people.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <div>
              <p className="text-sm font-semibold">{p.full_name}</p>
              <p className="text-xs text-ink-mid">
                {p.email}
                {' · signed up '}
                {new Date(p.created_at).toLocaleDateString('en-US',
                  { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <form action={resend}>
              <input type="hidden" name="id" value={p.id} />
              <Button type="submit" variant="ghost">Send it again</Button>
            </form>
          </li>
        ))}
      </ul>
    </Card>
  );
}
