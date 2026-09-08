'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { recordDonation } from '@/app/actions/money';
import { Card, Notice, Field, Toggle } from '@/components/ui';
import { Submit } from '@/components/money/forms';

export default function DonationForm({ funds }: { funds: { id: string; name: string }[] }) {
  const [state, action] = useFormState(recordDonation, {});
  const [inKind, setInKind] = useState(false);

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-bold">Record a gift</h2>
      <p className="mb-4 text-sm text-ink-mid">
        The donor is matched by email if they have given before.
      </p>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{state.ok}</Notice>}

      <form action={action}>
        <Field label="Donor name" name="donor_name" required placeholder="Dr. Mizanur Zaman" />
        <Field label="Email" name="donor_email" type="email" placeholder="Optional, but used to match repeat donors" />
        <Field label="Donor type" name="donor_type" as="select"
          options={[
            { value: 'individual', label: 'Individual' },
            { value: 'alumni', label: 'Alum' },
            { value: 'faculty', label: 'Faculty or staff' },
            { value: 'university', label: 'University' },
            { value: 'business', label: 'Local business' },
            { value: 'organization', label: 'Organization' },
          ]} />

        <Field label="Fund" name="fund_id" as="select"
          hint="Restricted funds can only be spent on their stated purpose."
          options={funds.map((f) => ({ value: f.id, label: f.name }))} />

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Amount" name="amount" placeholder="100.00" required />
          <Field label="Received" name="received_on" type="date"
            defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>

        <div className="mb-3" onChange={(e) => {
          const t = e.target as HTMLInputElement;
          if (t.name === 'is_in_kind') setInKind(t.checked);
        }}>
          <Toggle label="In-kind gift (goods or services, not cash)" name="is_in_kind" defaultChecked={false} />
        </div>

        {inKind ? (
          <Field label="What was given" name="in_kind_description"
            placeholder="e.g. catering for 60 people"
            hint="Recorded with an estimated value, but kept out of cash totals." />
        ) : (
          <Field label="Method" name="method" as="select"
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'check', label: 'Check' },
              { value: 'zelle', label: 'Zelle' },
              { value: 'card', label: 'Card' },
              { value: 'other', label: 'Other' },
            ]} />
        )}

        <Field label="Note" name="note" placeholder="Optional" />
        <Submit label="Record gift" full />
      </form>
    </Card>
  );
}
