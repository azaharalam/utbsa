'use client';

import { useRef, useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { recordPayment } from '@/app/actions/money';
import { Card, Notice, Field } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import { ResetOnSuccess, Confirmation } from '@/components/money/form-result';
import { SEASONS, yearOptions } from '@/lib/money';

export default function PaymentForm({
  members, funds,
}: {
  members: { id: string; name: string; balance: number }[];
  funds: { id: string; name: string; balance: number }[];
}) {
  const [state, action] = useFormState(recordPayment, {});
  const [method, setMethod] = useState('cash');
  const formRef = useRef<HTMLFormElement>(null);

  const years = yearOptions();
  const thisYear = new Date().getFullYear();
  const month = new Date().getMonth();
  const guessSeason = month < 4 ? 'spring' : month < 7 ? 'summer' : 'fall';

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-bold">Record a payment</h2>
      <p className="mb-4 text-sm text-ink-mid">
        Cash at a picnic, a bank transfer, or dues covered from a fund. Partial amounts
        are fine — the balance just goes down by what was paid.
      </p>

      {state?.error && <Notice tone="error">{state?.error}</Notice>}
      <Confirmation message={state?.ok} />

      <form action={action} ref={formRef}>
        <ResetOnSuccess ok={state?.ok} formRef={formRef} />

        <Field label="Member" name="member_id" as="select"
          options={members.map((m) => ({
            value: m.id,
            label: m.balance > 0 ? `${m.name} — owes $${(m.balance / 100).toFixed(2)}` : m.name,
          }))} />

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Amount" name="amount" placeholder="15.00" required />
          <Field label="Date received" name="paid_on" type="date"
            defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>

        {/* Semester and year, not a term picker. The term is created if it
            does not exist, so nothing has to be set up first. */}
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="For which semester" name="season" as="select" defaultValue={guessSeason}
            options={SEASONS.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} />
          <Field label="Year" name="year" as="select" defaultValue={String(thisYear)}
            options={years.map((y) => ({ value: String(y), label: String(y) }))} />
        </div>

        <div className="mb-4">
          <label htmlFor="method" className="mb-1.5 block text-xs font-semibold text-ink-mid">
            How it was paid
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

        <Field label="Note" name="note" placeholder="Optional" />
        <Submit label="Record payment" full />
      </form>
    </Card>
  );
}
