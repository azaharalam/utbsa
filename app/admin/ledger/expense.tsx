'use client';

import { useFormState } from 'react-dom';
import { recordExpense } from '@/app/actions/money';
import { Card, Notice, Field } from '@/components/ui';
import { Submit } from '@/components/money/forms';

export default function ExpenseForm({ funds }: { funds: { id: string; name: string }[] }) {
  const [state, action] = useFormState(recordExpense, {});

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-bold">Record an expense</h2>
      <p className="mb-4 text-sm text-ink-mid">
        Venue hire, food, equipment. Nothing is ever edited or deleted — a mistake
        is corrected with an offsetting entry.
      </p>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{state.ok}</Notice>}

      <form action={action}>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Amount" name="amount" placeholder="120.00" required />
          <Field label="Date" name="occurred_on" type="date"
            defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
        <Field label="Category" name="category" as="select"
          options={[
            { value: 'expense', label: 'General expense' },
            { value: 'processing_fee', label: 'Card processing fee' },
          ]} />
        <Field label="From which fund" name="fund_id" as="select"
          hint="Leave blank for general spending."
          options={funds.map((f) => ({ value: f.id, label: f.name }))} />
        <Field label="What was it for" name="note" required placeholder="Shelter booking, Wildwood" />
        <Submit label="Record expense" full />
      </form>
    </Card>
  );
}
