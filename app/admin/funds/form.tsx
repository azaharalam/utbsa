'use client';

import { useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import { createFund } from '@/app/actions/money';
import { Card, Notice, Field, Toggle } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import { ResetOnSuccess, Confirmation } from '@/components/money/form-result';

const DONOR_TYPES = [
  { value: 'university', label: 'University department or office' },
  { value: 'business', label: 'Local business' },
  { value: 'organization', label: 'Organization' },
  { value: 'individual', label: 'Individual' },
  { value: 'student', label: 'Student' },
  { value: 'alumni', label: 'Alum' },
  { value: 'faculty', label: 'Faculty or staff' },
];

/**
 * A fund's balance is never typed in — it is donations paid in minus what has
 * been spent out. So this form does not ask for an amount; it asks who gave
 * the money, which is the question that makes the balance explainable later.
 */
export default function FundForm() {
  const [state, action] = useFormState(createFund, {});
  const [withGift, setWithGift] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-bold">New fund</h2>
      <p className="mb-4 text-sm text-ink-mid">
        Usually one per major event, plus the standing ones.
      </p>

      {state?.error && <Notice tone="error">{state?.error}</Notice>}
      <Confirmation message={state?.ok} />

      <form action={action} ref={formRef}>
        <ResetOnSuccess ok={state?.ok} formRef={formRef} also={() => setWithGift(false)} />

        <Field label="Name" name="name" required placeholder="Boishakh 1432" />
        <Field label="What it is for" name="description"
          placeholder="Restricted to the spring cultural programme" />

        <div className="mb-4">
          <Toggle label="Restricted — can only be spent on this purpose"
            name="is_restricted" defaultChecked={true} />
        </div>

        <hr className="stitch my-4 border-0" />

        {/* This is the answer to "why is my new fund at $0?" */}
        <div className="mb-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={withGift}
              onChange={(e) => setWithGift(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#1F6F55]" />
            <span>
              <span className="block text-sm font-semibold">
                Money has already been given for this
              </span>
              <span className="block text-xs text-ink-mid">
                Record it now and the fund opens with that balance.
              </span>
            </span>
          </label>
        </div>

        {withGift && (
          <div className="mb-4 rounded-lg border-2 border-dashed border-stitch bg-muslin p-3">
            <p className="mb-3 text-xs text-ink-mid">
              A fund&apos;s balance is worked out from the gifts paid into it, never
              typed in. So this records a real donation — which is what lets anyone
              answer &ldquo;where did that money come from?&rdquo; a year from now.
            </p>

            <Field label="Who gave it" name="opening_donor"
              placeholder="UToledo Office of Student Involvement" />
            <Field label="Donor type" name="opening_donor_type" as="select"
              options={DONOR_TYPES} />
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="Amount" name="opening_amount" placeholder="500.00" />
              <Field label="Received" name="opening_received" type="date"
                defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <Field label="Note" name="opening_note" placeholder="Optional" />
          </div>
        )}

        <Submit label="Create fund" full />
      </form>

      {!withGift && (
        <p className="mt-3 text-xs text-ink-mid">
          A new fund starts at $0. To put money in later, record the gift at{' '}
          <a href="/admin/donations" className="font-semibold text-kantha">Donations</a>{' '}
          and choose this fund.
        </p>
      )}
    </Card>
  );
}
