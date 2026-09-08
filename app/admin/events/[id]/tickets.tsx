'use client';

import { useRef, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { sellTicket } from '@/app/actions/inbox';
import { Card, Notice, Field } from '@/components/ui';
import { ResetOnSuccess, Confirmation } from '@/components/money/form-result';
import { Submit, Money } from '@/components/money/forms';
import type { TicketOrder } from '@/lib/money';

function Clear({ ok, formRef }: { ok?: string; formRef: React.RefObject<HTMLFormElement> }) {
  const { pending } = useFormStatus();
  useEffect(() => { if (ok && !pending) formRef.current?.reset(); }, [ok, pending, formRef]);
  return null;
}

/** Cash at the gate. Members play free, so this is for non-members. */
export default function TicketDesk({
  eventId, orders, guestPrice, childPrice,
}: {
  eventId: string; orders: TicketOrder[]; guestPrice: number; childPrice: number;
}) {
  const [state, action] = useFormState(sellTicket, {});
  const formRef = useRef<HTMLFormElement>(null);
  const paid = orders.filter((o) => o.status === 'paid');

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-bold">Door sales</h2>
      <p className="mb-4 text-sm text-ink-mid">
        Members attend free — the semester fee covers it. This is for non-members
        paying at the gate. Goes straight into the ledger as ticket income.
      </p>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Confirmation message={state.ok} />

      <form action={action} ref={formRef}>
        <ResetOnSuccess ok={state.ok} formRef={formRef} />
        <Clear ok={state.ok} formRef={formRef} />
        <input type="hidden" name="event_id" value={eventId} />

        <Field label="Name" name="purchaser_name" placeholder="Walk-up" />
        <Field label="Email" name="purchaser_email" type="email" placeholder="Optional" />

        <div className="grid gap-x-4 sm:grid-cols-3">
          <Field label="Adults" name="qty_adult" type="number" defaultValue="1" />
          <Field label="Children" name="qty_child" type="number" defaultValue="0" />
          <Field label="Amount taken" name="amount"
            defaultValue={(guestPrice / 100).toFixed(2)} required />
        </div>

        <Field label="How they paid" name="method" as="select"
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'zelle', label: 'Zelle' },
            { value: 'other', label: 'Other' },
          ]} />

        <Submit label="Record sale" full />
      </form>

      {paid.length > 0 && (
        <>
          <hr className="stitch my-4 border-0" />
          <h3 className="mb-2 font-display text-sm font-bold">Sold so far</h3>
          <ul className="space-y-1 text-sm">
            {paid.map((o) => (
              <li key={o.id} className="flex items-center gap-2">
                <span>{o.purchaser_name}</span>
                <span className="text-xs text-ink-mid">
                  {o.qty_adult + o.qty_child} ticket{o.qty_adult + o.qty_child === 1 ? '' : 's'}
                </span>
                <span className="ml-auto"><Money cents={o.amount_cents} /></span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
