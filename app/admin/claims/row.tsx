'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { confirmClaim, rejectClaim } from '@/app/actions/money';
import { Card, Pill, Avatar, Notice } from '@/components/ui';
import { Submit, Money } from '@/components/money/forms';
import { Confirmation, useCloseOnSuccess } from '@/components/money/form-result';

/**
 * A transfer claim.
 *
 * Laid out in three bands rather than one crowded row: who and when, then
 * what they say they sent, then what you can do about it. The amount and the
 * transaction reference are the two things you carry across to the bank app,
 * so they get their own line and a monospace font.
 */
export default function ClaimRow({ claim }: { claim: any }) {
  const [confirmState, confirm] = useFormState(confirmClaim, {});
  const [rejectState, reject] = useFormState(rejectClaim, {});
  const [rejecting, setRejecting] = useState(false);

  useCloseOnSuccess(rejectState?.ok, () => setRejecting(false));

  const pending = claim.status === 'pending';
  const err = confirmState?.error || rejectState?.error;

  return (
    <Card>
      {err && <Notice tone="error">{err}</Notice>}
      <Confirmation message={confirmState?.ok ?? rejectState?.ok} />

      {/* who */}
      <div className="flex items-start gap-3">
        <Avatar name={claim.member_name} size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold leading-tight">
            {claim.member_name}
          </p>
          <p className="truncate text-sm text-ink-mid">{claim.member_email}</p>
          <p className="mt-0.5 text-xs text-ink-mid">
            Sent {new Date(claim.sent_on).toLocaleDateString('en-US',
              { day: 'numeric', month: 'short', year: 'numeric' })}
            {' · '}balance <Money cents={claim.balance_cents ?? 0} />
            {claim.submitted_via === 'token' && ' · from an email link'}
          </p>
        </div>

        {!pending && (
          <Pill tone={claim.status === 'confirmed' ? 'green' : 'red'}>{claim.status}</Pill>
        )}
      </div>

      {/* what they say they sent */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-muslin px-3 py-2.5">
        <span className="font-display text-xl font-bold text-nil">
          <Money cents={claim.amount_cents} />
        </span>
        <code className="rounded border border-[#D6D1C2] bg-white px-2 py-1 font-mono text-sm">
          {claim.transaction_ref}
        </code>
        {claim.note && (
          <span className="min-w-0 flex-1 text-sm text-ink-mid">{claim.note}</span>
        )}
      </div>

      {claim.status === 'rejected' && claim.reject_reason && (
        <p className="mt-2 text-sm text-alta">{claim.reject_reason}</p>
      )}

      {/* what you can do */}
      {pending && !rejecting && (
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={confirm}>
            <input type="hidden" name="id" value={claim.id} />
            <Submit label="Confirm" />
          </form>
          <button onClick={() => setRejecting(true)}
            className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
            Reject
          </button>
        </div>
      )}

      {pending && rejecting && (
        <form action={reject} className="mt-3 border-t-2 border-dashed border-stitch pt-3">
          <input type="hidden" name="id" value={claim.id} />
          <label className="mb-1.5 block text-xs font-semibold text-ink-mid">
            Why — the member sees this <span className="text-alta">*</span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input name="reason" required
              placeholder="Nothing arrived with that reference"
              className="flex-1 rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 text-sm" />
            <div className="flex gap-2">
              <Submit label="Reject" variant="danger" />
              <button type="button" onClick={() => setRejecting(false)}
                className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </Card>
  );
}
