'use client';

import { useFormState } from 'react-dom';
import { createFund } from '@/app/actions/money';
import { Card, Notice, Field, Toggle } from '@/components/ui';
import { Submit } from '@/components/money/forms';

export default function FundForm() {
  const [state, action] = useFormState(createFund, {});

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-bold">New fund</h2>
      <p className="mb-4 text-sm text-ink-mid">
        Usually one per major event, plus the standing ones.
      </p>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{state.ok}</Notice>}

      <form action={action}>
        <Field label="Name" name="name" required placeholder="Boishakh 1434" />
        <Field label="What it is for" name="description" as="textarea" rows={2}
          placeholder="Optional" />
        <div className="mb-4">
          <Toggle label="Restricted — can only be spent on this purpose"
            name="is_restricted" defaultChecked={true} />
        </div>
        <Submit label="Create fund" full />
      </form>
    </Card>
  );
}
