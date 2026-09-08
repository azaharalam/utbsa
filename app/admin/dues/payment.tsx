'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { recordPayment } from '@/app/actions/money';
import { Card, Notice, Field } from '@/components/ui';
import { Submit } from '@/components/money/forms';

export default function PaymentForm({
  households, terms, funds,
}: {
  households: { id: string; label: string; balance: number }[];
  terms: { id: string; name: string }[];
  funds: { id: string; name: string; balance: number }[];
}) {
  const [state, action] = useFormState(recordPayment, {});
  const [method, setMethod] = useState('cash');

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-bold">Record a payment</h2>
      <p className="mb-4 text-sm text-ink-mid">
        Cash at a picnic, a bank transfer, or dues covered from a fund. Partial
        amounts are fine — the balance just goes down by what was paid.
      </p>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{state.ok}</Notice>}

      <form action={action}>
        <Field label="Household" name="household_id" as="select"
          options={households.map((h) => ({
            value: h.id,
            label: h.balance > 0 ? `${h.label} — owes $${(h.balance / 100).toFixed(2)}` : h.label,
          }))} />

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Amount" name="amount" placeholder="15.00" required />
          <Field label="Date" name="paid_on" type="date"
            defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>

        <div className="mb-4">
          <label htmlFor="method" className="mb-1.5 block text-xs font-semibold text-ink-mid">
            Method
          </label>
          <select id="method" name="method" value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5">
            <option value="cash">Cash</option>
            <option value="zelle">Zelle</option>
            <option value="check">Check</option>
            <option value="card">Card</option>
            <option value="fund">Covered from a fund</option>
            <option value="other">Other</option>
          </select>
        </div>

        {method === 'fund' && (
          <Field label="Which fund" name="fund_id" as="select"
            hint="Draws the fund down and clears the member's balance in one step."
            options={funds.map((f) => ({
              value: f.id, label: `${f.name} — $${(f.balance / 100).toFixed(2)} available`,
            }))} />
        )}

        <Field label="Term" name="term_id" as="select"
          options={terms.map((t) => ({ value: t.id, label: t.name }))} />
        <Field label="Note" name="note" placeholder="Optional" />

        <Submit label="Record payment" full />
      </form>
    </Card>
  );
}
