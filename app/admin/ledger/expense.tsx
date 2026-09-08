'use client';

import { useRef, useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { recordExpense } from '@/app/actions/money';
import { Card, Notice, Field } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import { EXPENSE_CATEGORIES } from '@/lib/money';

function Clear({ ok, formRef }: { ok?: string; formRef: React.RefObject<HTMLFormElement> }) {
  const { pending } = useFormStatus();
  useEffect(() => { if (ok && !pending) formRef.current?.reset(); }, [ok, pending, formRef]);
  return null;
}

export default function ExpenseForm({ funds }: { funds: { id: string; name: string }[] }) {
  const [state, action] = useFormState(recordExpense, {});
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const formRef = useRef<HTMLFormElement>(null);
  const isOther = category === 'Other';

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-bold">Record an expense</h2>
      <p className="mb-4 text-sm text-ink-mid">
        Money going out. Nothing is ever edited or deleted — a mistake is corrected
        with an offsetting entry, so the history stays honest.
      </p>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{state.ok}</Notice>}

      <form action={action} ref={formRef}>
        <Clear ok={state.ok} formRef={formRef} />

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Amount" name="amount" placeholder="120.00" required />
          <Field label="Date" name="occurred_on" type="date"
            defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>

        <div className="mb-4">
          <label htmlFor="category" className="mb-1.5 block text-xs font-semibold text-ink-mid">
            What kind of expense
          </label>
          <select id="category" name="category" value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5">
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <Field label="Which fund did it come from" name="fund_id" as="select"
          hint="Leave blank for general spending. Restricted funds can only pay for their stated purpose."
          options={funds.map((f) => ({ value: f.id, label: f.name }))} />

        <Field
          label={isOther ? 'What was it for — required' : 'What was it for'}
          name="note" required
          placeholder={isOther ? 'Describe it properly, since the category does not say' : 'Shelter booking, Wildwood'}
          hint={isOther ? 'Because you picked Other, this needs enough detail for someone to understand it next year.' : undefined}
        />

        <Submit label="Record expense" full />
      </form>
    </Card>
  );
}
