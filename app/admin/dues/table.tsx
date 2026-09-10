'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { sendReminders, waiveBalance, recordPayment } from '@/app/actions/money';
import { Card, Notice, Pill, Avatar } from '@/components/ui';
import { useCloseOnSuccess } from '@/components/money/form-result';
import { Submit, Money } from '@/components/money/forms';
import { SEASONS, yearOptions } from '@/lib/money';
import type { MemberBalance } from '@/lib/money';

const sel = 'w-full rounded-lg border border-[#D6D1C2] bg-white px-2 py-2.5 text-sm';

export default function DuesTable({
  rows, funds,
}: {
  rows: MemberBalance[];
  funds: { id: string; name: string; balance: number }[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [mode, setMode] = useState<'waive' | 'fund'>('waive');

  const [remindState, remind] = useFormState(sendReminders, {});
  const [waiveState, waive] = useFormState(waiveBalance, {});
  const [fundState, payFromFund] = useFormState(recordPayment, {});

  // The inline waive / cover panel should shut once the adjustment lands —
  // leaving it open shows a form for money already moved.
  useCloseOnSuccess(fundState?.ok, () => setOpenRow(null));
  useCloseOnSuccess(waiveState?.ok, () => setOpenRow(null));

  const owing = rows.filter((r) => r.balance_cents > 0);
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const years = yearOptions();
  const thisYear = new Date().getFullYear();

  return (
    <>
      {remindState?.error && <Notice tone="error">{remindState?.error}</Notice>}
      {remindState?.ok && <Notice tone="success">{remindState?.ok}</Notice>}
      {waiveState?.error && <Notice tone="error">{waiveState?.error}</Notice>}
      {waiveState?.ok && <Notice tone="success">{waiveState?.ok}</Notice>}
      {fundState?.error && <Notice tone="error">{fundState?.error}</Notice>}
      {fundState?.ok && <Notice tone="success">{fundState?.ok}</Notice>}

      {owing.length > 0 && (
        <form action={remind} className="mb-4 flex flex-wrap items-center gap-3">
          {selected.map((id) => <input key={id} type="hidden" name="member_id" value={id} />)}
          <button type="button"
            onClick={() => setSelected(selected.length === owing.length ? [] : owing.map((r) => r.member_id))}
            className="text-sm font-semibold text-kantha">
            {selected.length === owing.length ? 'Clear all' : 'Select everyone owing'}
          </button>
          <span className="text-sm text-ink-mid">{selected.length} selected</span>
          {selected.length > 0 && <Submit label="Send reminder" variant="ghost" />}
        </form>
      )}

      <div className="space-y-3">
        {rows.map((r) => {
          const owes = r.balance_cents > 0;
          return (
            <Card key={r.member_id} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                {owes && (
                  <input type="checkbox" checked={selected.includes(r.member_id)}
                    onChange={() => toggle(r.member_id)}
                    aria-label={`Select ${r.full_name}`}
                    className="h-5 w-5 shrink-0 accent-[#1F6F55]" />
                )}
                <Avatar name={r.full_name} url={r.photo_url} size={38} />

                <div className="min-w-0 flex-1">
                  <p className="font-display text-[15px] font-bold">{r.full_name}</p>
                  <p className="text-xs text-ink-mid">
                    {[r.member_type === 'student' ? r.student_level?.toUpperCase() : r.member_type,
                      r.department].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-xs text-ink-mid">
                    charged <Money cents={r.charged_cents} /> · paid <Money cents={r.paid_cents} />
                    {r.adjusted_cents !== 0 && <> · adjusted <Money cents={r.adjusted_cents} /></>}
                  </p>
                </div>

                {owes
                  ? <Pill tone="gold"><Money cents={r.balance_cents} /></Pill>
                  : <span className="text-sm"><Money cents={r.balance_cents} bold /></span>}

                {r.balance_cents !== 0 && (
                  <button
                    onClick={() => setOpenRow(openRow === r.member_id ? null : r.member_id)}
                    className="min-h-[40px] rounded-lg border-[1.5px] border-nil px-3 text-sm font-semibold text-nil">
                    {openRow === r.member_id ? 'Close' : 'Action'}
                  </button>
                )}
              </div>

              {openRow === r.member_id && (
                <div className="mt-4 border-t-2 border-dashed border-stitch pt-4">
                  <div className="mb-3 flex gap-2">
                    <button onClick={() => setMode('waive')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === 'waive' ? 'bg-nil text-white' : 'bg-muslin-deep text-ink-mid'}`}>
                      Waive or adjust
                    </button>
                    <button onClick={() => setMode('fund')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === 'fund' ? 'bg-nil text-white' : 'bg-muslin-deep text-ink-mid'}`}>
                      Cover from fund
                    </button>
                  </div>

                  {mode === 'waive' ? (
                    <form action={waive} className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
                      <input type="hidden" name="member_id" value={r.member_id} />
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-ink-mid">Kind</label>
                        <select name="kind" className={sel}>
                          <option value="waiver">Waiver</option>
                          <option value="write_off">Write off</option>
                          <option value="credit">Credit</option>
                          <option value="correction">Correction</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-ink-mid">Amount</label>
                        <input name="amount" defaultValue={(Math.abs(r.balance_cents) / 100).toFixed(2)} className={sel} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-ink-mid">
                          Reason <span className="text-alta">*</span>
                        </label>
                        <input name="reason" required placeholder="e.g. financial hardship" className={sel} />
                      </div>
                      <Submit label="Apply" />
                    </form>
                  ) : (
                    <form action={payFromFund} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
                      <input type="hidden" name="member_id" value={r.member_id} />
                      <input type="hidden" name="method" value="fund" />
                      <input type="hidden" name="paid_on" value={new Date().toISOString().slice(0, 10)} />
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-ink-mid">Fund</label>
                        <select name="fund_id" className={sel}>
                          {funds.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name} — ${(f.balance / 100).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-ink-mid">Amount</label>
                        <input name="amount" defaultValue={(r.balance_cents / 100).toFixed(2)} className={sel} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-ink-mid">Semester</label>
                        <select name="season" defaultValue="fall" className={sel}>
                          {SEASONS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-ink-mid">Year</label>
                        <select name="year" defaultValue={String(thisYear)} className={sel}>
                          {years.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <Submit label="Cover" />
                    </form>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
