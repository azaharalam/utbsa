'use client';

import { useRef, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { submitPaymentClaim } from '@/app/actions/money';
import { Card, Field, Notice, Pill } from '@/components/ui';
import { Done } from '@/components/money/form-result';
import { Submit, Money } from '@/components/money/forms';
import type { PaymentClaim } from '@/lib/queries/claims';

function Clear({ ok, formRef }: { ok?: string; formRef: React.RefObject<HTMLFormElement> }) {
  const { pending } = useFormStatus();
  useEffect(() => { if (ok && !pending) formRef.current?.reset(); }, [ok, pending, formRef]);
  return null;
}

export default function ClaimForm({
  firstName, balanceCents, settings, recent, via, token,
}: {
  firstName: string;
  balanceCents: number;
  settings: { method: string; name: string; handle: string; instructions: string | null };
  recent: PaymentClaim[];
  via: 'link' | 'portal';
  token?: string;
}) {
  const [state, action] = useFormState(submitPaymentClaim, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Nothing follows a sent message, so the form has no reason to stay.
  if (state.ok) {
    return (
      <Done title="Thank you">
        <p className="text-sm text-ink-mid">
          The treasurer will check it against the account and confirm. Your balance updates once they do — a reference on its own does not move it.
        </p>
      </Done>
    );
  }

  return (
    <>
      <Card>
        <h1 className="mb-1 font-display text-2xl font-bold">
          {via === 'link' ? `Hello, ${firstName}` : 'Tell us about a transfer'}
        </h1>

        {balanceCents > 0 ? (
          <p className="mb-4 text-sm text-ink-mid">
            Your balance is <span className="font-semibold text-ink"><Money cents={balanceCents} /></span>.
            Unpaid amounts simply carry over — there is no penalty and no deadline.
          </p>
        ) : (
          <p className="mb-4 text-sm text-ink-mid">
            Your balance is <Money cents={balanceCents} />. You can still record a transfer
            if you have sent one.
          </p>
        )}

        <div className="mb-5 rounded-lg border-2 border-dashed border-kantha bg-kantha-pale p-4">
          <p className="mb-2 font-display text-base font-bold">Send it by {settings.method}</p>
          <dl className="space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-ink-mid">To</dt>
              <dd className="font-semibold">{settings.name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-ink-mid">At</dt>
              <dd className="break-all font-semibold">{settings.handle}</dd>
            </div>
          </dl>
          {settings.instructions && (
            <p className="mt-3 text-sm text-ink-mid">{settings.instructions}</p>
          )}
        </div>

        {state.error && <Notice tone="error">{state.error}</Notice>}
        {state.ok && <Notice tone="success">{state.ok}</Notice>}

        <form action={action} ref={formRef}>
          <Clear ok={state.ok} formRef={formRef} />
          <input type="hidden" name="via" value={via} />
          {token && <input type="hidden" name="token" value={token} />}

          <Field
            label="Transaction ID" name="transaction_ref" required
            placeholder="From your bank's confirmation"
            hint="Whatever reference your bank shows for the transfer."
          />
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Amount you sent" name="amount" required
              defaultValue={balanceCents > 0 ? (balanceCents / 100).toFixed(2) : ''} />
            <Field label="Date you sent it" name="sent_on" type="date" required
              defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <Field label="Anything to add" name="note" placeholder="Optional" />

          <Submit label="Submit" full />
        </form>

        <p className="mt-4 text-xs text-ink-mid">
          The treasurer checks this against the account before it counts, so your balance
          will not change straight away.
        </p>
      </Card>

      {recent.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 font-display text-base font-bold">What you have submitted</h2>
          <div className="space-y-2">
            {recent.map((c) => (
              <Card key={c.id} className="p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono text-xs">{c.transaction_ref}</span>
                  <Money cents={c.amount_cents} />
                  <span className="text-xs text-ink-mid">
                    {new Date(c.sent_on).toLocaleDateString('en-US',
                      { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="ml-auto">
                    <Pill tone={c.status === 'confirmed' ? 'green'
                              : c.status === 'rejected' ? 'red' : 'gold'}>
                      {c.status === 'pending' ? 'being checked' : c.status}
                    </Pill>
                  </span>
                </div>
                {c.reject_reason && (
                  <p className="mt-1 text-xs text-alta">{c.reject_reason}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
