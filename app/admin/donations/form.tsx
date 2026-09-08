'use client';

import { useRef, useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { recordDonation } from '@/app/actions/money';
import { Card, Notice, Field, Toggle } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import { ResetOnSuccess, Confirmation } from '@/components/money/form-result';

export default function DonationForm() {
  const [state, action] = useFormState(recordDonation, {});
  const [inKind, setInKind] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-bold">Record a gift</h2>
      <p className="mb-4 text-sm text-ink-mid">
        Someone hands over money or goods, you write it down here. Gifts go into the
        General fund — move one into a restricted fund from the list on the right if
        it was given for a specific purpose.
      </p>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Confirmation message={state.ok} />

      <form action={action} ref={formRef}>
        <ResetOnSuccess ok={state.ok} formRef={formRef} also={() => setInKind(false)} />

        <Field label="Who gave it" name="donor_name" required placeholder="Dr. Mizanur Zaman" />

        <Field label="Donor type" name="donor_type" as="select"
          options={[
            { value: 'individual', label: 'Individual' },
            { value: 'student', label: 'Student' },
            { value: 'alumni', label: 'Alum' },
            { value: 'faculty', label: 'Faculty or staff' },
            { value: 'university', label: 'University department or office' },
            { value: 'business', label: 'Local business' },
            { value: 'organization', label: 'Organization' },
          ]} />

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Amount" name="amount" placeholder="100.00" required />
          <Field label="Received" name="received_on" type="date"
            defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>

        <div className="mb-3" onChange={(e) => {
          const t = e.target as HTMLInputElement;
          if (t.name === 'is_in_kind') setInKind(t.checked);
        }}>
          <Toggle label="Goods or services, not money" name="is_in_kind" defaultChecked={false} />
        </div>

        {inKind ? (
          <Field label="What was given" name="in_kind_description"
            placeholder="e.g. catering for 60 people"
            hint="Recorded with an estimated value, but kept out of cash totals — you cannot spend a donated meal." />
        ) : (
          <Field label="How it was paid" name="method" as="select"
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'check', label: 'Check' },
              { value: 'zelle', label: 'Zelle' },
              { value: 'card', label: 'Card' },
              { value: 'other', label: 'Other' },
            ]} />
        )}

        <Submit label="Record gift" full />
      </form>
    </Card>
  );
}
