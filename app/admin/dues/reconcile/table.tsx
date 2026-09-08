'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { sendReminders, waiveBalance, recordPayment } from '@/app/actions/money';
import { Card, Notice, Pill } from '@/components/ui';
import { Submit, Money } from '@/components/money/forms';
import type { HouseholdBalance } from '@/lib/money';

export default function ReconcileTable({
  rows, funds, terms,
}: {
  rows: HouseholdBalance[];
  funds: { id: string; name: string; balance: number }[];
  terms: { id: string; name: string }[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [mode, setMode] = useState<'waive' | 'fund'>('waive');

  const [remindState, remind] = useFormState(sendReminders, {});
  const [waiveState, waive] = useFormState(waiveBalance, {});
  const [fundState, payFromFund] = useFormState(recordPayment, {});

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const total = rows.reduce((s, r) => s + r.balance_cents, 0);

  return (
    <>
      {remindState.error && <Notice tone="error">{remindState.error}</Notice>}
      {remindState.ok && <Notice tone="success">{remindState.ok}</Notice>}
      {waiveState.error && <Notice tone="error">{waiveState.error}</Notice>}
      {waiveState.ok && <Notice tone="success">{waiveState.ok}</Notice>}
      {fundState.error && <Notice tone="error">{fundState.error}</Notice>}
      {fundState.ok && <Notice tone="success">{fundState.ok}</Notice>}

      {/* Bulk reminders. Without this, a hundred households means a hundred
          clicks and the feature quietly goes unused. */}
      <form action={remind} className="mb-4 flex flex-wrap items-center gap-3">
        {selected.map((id) => <input key={id} type="hidden" name="household_id" value={id} />)}
        <button type="button"
          onClick={() => setSelected(selected.length === rows.length ? [] : rows.map((r) => r.household_id))}
          className="text-sm font-semibold text-kantha">
          {selected.length === rows.length ? 'Clear all' : 'Select all'}
        </button>
        <span className="text-sm text-ink-mid">{selected.length} selected</span>
        {selected.length > 0 && <Submit label="Send reminder to selected" variant="ghost" />}
        <span className="ml-auto text-sm text-ink-mid">
          Total outstanding: <Money cents={total} bold />
        </span>
      </form>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.household_id} className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <input type="checkbox" checked={selected.includes(r.household_id)}
                onChange={() => toggle(r.household_id)}
                aria-label={`Select ${r.member_names}`}
                className="h-5 w-5 shrink-0 accent-[#1F6F55]" />

              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] font-bold">{r.member_names}</p>
                <p className="text-xs text-ink-mid">
                  charged <Money cents={r.charged_cents} /> · paid <Money cents={r.paid_cents} />
                  {r.adjusted_cents !== 0 && <> · adjusted <Money cents={r.adjusted_cents} /></>}
                </p>
              </div>

              <Pill tone="gold"><Money cents={r.balance_cents} /></Pill>

              <button
                onClick={() => setOpenRow(openRow === r.household_id ? null : r.household_id)}
                className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-3 text-sm font-semibold text-nil">
                {openRow === r.household_id ? 'Close' : 'Action'}
              </button>
            </div>

            {openRow === r.household_id && (
              <div className="mt-4 border-t-2 border-dashed border-stitch pt-4">
                <div className="mb-3 flex gap-2">
                  <button onClick={() => setMode('waive')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === 'waive' ? 'bg-nil text-white' : 'bg-muslin-deep text-ink-mid'}`}>
                    Waive
                  </button>
                  <button onClick={() => setMode('fund')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === 'fund' ? 'bg-nil text-white' : 'bg-muslin-deep text-ink-mid'}`}>
                    Cover from fund
                  </button>
                </div>

                {mode === 'waive' ? (
                  <form action={waive} className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
                    <input type="hidden" name="household_id" value={r.household_id} />
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-ink-mid">Kind</label>
                      <select name="kind" className="w-full rounded-lg border border-[#D6D1C2] bg-white px-2 py-2.5 text-sm">
                        <option value="waiver">Waiver</option>
                        <option value="write_off">Write off</option>
                        <option value="credit">Credit</option>
                        <option value="correction">Correction</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-ink-mid">Amount</label>
                      <input name="amount" defaultValue={(r.balance_cents / 100).toFixed(2)}
                        className="w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-ink-mid">
                        Reason <span className="text-alta">*</span>
                      </label>
                      <input name="reason" required placeholder="e.g. financial hardship"
                        className="w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 text-sm" />
                    </div>
                    <Submit label="Apply" />
                  </form>
                ) : (
                  <form action={payFromFund} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
                    <input type="hidden" name="household_id" value={r.household_id} />
                    <input type="hidden" name="method" value="fund" />
                    <input type="hidden" name="paid_on" value={new Date().toISOString().slice(0, 10)} />
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-ink-mid">Fund</label>
                      <select name="fund_id" className="w-full rounded-lg border border-[#D6D1C2] bg-white px-2 py-2.5 text-sm">
                        {funds.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name} — ${(f.balance / 100).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-ink-mid">Amount</label>
                      <input name="amount" defaultValue={(r.balance_cents / 100).toFixed(2)}
                        className="w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-ink-mid">Term</label>
                      <select name="term_id" className="w-full rounded-lg border border-[#D6D1C2] bg-white px-2 py-2.5 text-sm">
                        {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <Submit label="Cover" />
                  </form>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
