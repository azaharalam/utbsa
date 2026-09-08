'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { acknowledgeDonation, reassignDonationFund } from '@/app/actions/money';
import { Card, Pill, Notice } from '@/components/ui';
import { Money } from '@/components/money/forms';

function Saving({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="min-h-[36px] rounded-lg border-[1.5px] border-nil px-3 text-xs font-semibold text-nil disabled:opacity-50">
      {pending ? 'Saving…' : label}
    </button>
  );
}

function FundSelect({ funds, current }: {
  funds: { id: string; name: string; is_restricted: boolean }[]; current: string;
}) {
  const { pending } = useFormStatus();
  return (
    <select name="fund_id" defaultValue={current} disabled={pending}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      aria-label="Which fund this gift belongs to"
      className="rounded-lg border border-[#D6D1C2] bg-white px-2 py-1.5 text-xs disabled:opacity-50">
      {funds.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}{f.is_restricted ? ' (restricted)' : ''}
        </option>
      ))}
    </select>
  );
}

/**
 * One recorded gift.
 *
 * Errors used to be discarded here, so a failed action looked identical to a
 * successful one — nothing moved and nothing explained why.
 */
export default function Gift({ gift, funds }: {
  gift: any; funds: { id: string; name: string; is_restricted: boolean }[];
}) {
  const [ackState, ack] = useFormState(acknowledgeDonation, {});
  const [moveState, move] = useFormState(reassignDonationFund, {});
  const [note, setNote] = useState<string | null>(null);

  const err = ackState.error || moveState.error;
  const thanked = !!gift.acknowledged_at || !!ackState.ok;

  return (
    <Card>
      {err && <Notice tone="error">{err}</Notice>}

      {/* who and how much */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold leading-tight">
            {gift.donor_name}
          </p>
          <p className="text-xs text-ink-mid">
            {new Date(gift.received_on).toLocaleDateString('en-US',
              { day: 'numeric', month: 'short', year: 'numeric' })}
            {' · '}
            {gift.is_in_kind ? 'goods, not cash' : gift.method}
          </p>
          {gift.in_kind_description && (
            <p className="mt-1 text-sm text-ink-mid">{gift.in_kind_description}</p>
          )}
          {gift.note && !gift.in_kind_description && (
            <p className="mt-1 text-sm text-ink-mid">{gift.note}</p>
          )}
        </div>

        <div className="text-right">
          <p className="font-display text-xl font-bold text-nil">
            <Money cents={gift.amount_cents} />
          </p>
          {gift.is_in_kind && <p className="text-xs text-ink-mid">not cash</p>}
        </div>
      </div>

      {/* where it sits, and whether they have been thanked */}
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t-2 border-dashed border-stitch pt-3">
        <span className="text-xs text-ink-mid">Sits in</span>

        <form action={move}>
          <input type="hidden" name="id" value={gift.id} />
          <FundSelect funds={funds} current={gift.fund_id} />
        </form>

        {moveState.ok && <span className="text-xs text-kantha">moved</span>}

        <div className="ml-auto">
          {thanked ? (
            <Pill tone="green">thanked</Pill>
          ) : (
            <form action={ack}>
              <input type="hidden" name="id" value={gift.id} />
              <Saving label="Mark thanked" />
            </form>
          )}
        </div>
      </div>
    </Card>
  );
}
