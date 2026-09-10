'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { cancelEventAndRefund } from '@/app/actions/inbox';
import { Card, Notice } from '@/components/ui';
import { useCloseOnSuccess } from '@/components/money/form-result';
import { Submit, Money } from '@/components/money/forms';

/**
 * All or nothing, at the event level. Per-person refunds mean judgement calls,
 * partial states, and a ledger that stops balancing.
 */
export default function CancelBox({
  eventId, refund,
}: {
  eventId: string;
  refund: { total_cents: number; order_count: number; unrecoverable_fee_cents: number };
}) {
  const [state, action] = useFormState(cancelEventAndRefund, {});
  const [open, setOpen] = useState(false);

  useCloseOnSuccess(state?.ok, () => setOpen(false));

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-bold">Cancel this event</h2>
      <p className="mb-4 text-sm text-ink-mid">
        Refunds every ticket at once. No-shows get nothing back — that is what makes
        the headcount mean something.
      </p>

      {state?.error && <Notice tone="error">{state?.error}</Notice>}
      {state?.ok && <Notice tone="success">{state?.ok}</Notice>}

      {open ? (
        <form action={action}>
          <input type="hidden" name="event_id" value={eventId} />
          <Notice tone="error">
            This refunds <Money cents={refund.total_cents} /> to {refund.order_count}{' '}
            {refund.order_count === 1 ? 'person' : 'people'}.
            {refund.unrecoverable_fee_cents > 0 && (
              <> UTBSA will not recover roughly{' '}
              <Money cents={refund.unrecoverable_fee_cents} /> in processing fees,
              which appears in the ledger as a loss.</>
            )}
          </Notice>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-ink-mid">
              Why <span className="text-alta">*</span>
            </label>
            <input name="reason" required placeholder="Rained out, venue withdrew"
              className="w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 text-sm" />
          </div>
          <div className="flex gap-2">
            <Submit label="Cancel and refund" variant="danger" />
            <button type="button" onClick={() => setOpen(false)}
              className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
              Keep it
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setOpen(true)}
          className="min-h-[44px] rounded-lg border-[1.5px] border-alta px-4 text-sm font-semibold text-alta">
          Cancel event
        </button>
      )}
    </Card>
  );
}
