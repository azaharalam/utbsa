'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { assessTerm, setTermDues } from '@/app/actions/money';
import { Card, Notice, Field } from '@/components/ui';
import { Submit, Money } from '@/components/money/forms';
import { Confirmation, useCloseOnSuccess } from '@/components/money/form-result';
import { SEASONS, yearOptions } from '@/lib/money';

const sel = 'w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 text-sm';

/**
 * Semester and year, matching every other money form. The term is created if
 * it does not exist, so nobody has to set one up before charging dues.
 */
export default function AssessPanel({
  current,
}: {
  current: {
    term_id: string; term_name: string; student_count: number;
    dues_cents: number; total_cents: number; already_assessed: string | null;
    season: string; year: number;
  };
}) {
  const [assessState, assess] = useFormState(assessTerm, {});
  const [rateState, setRate] = useFormState(setTermDues, {});
  const [confirming, setConfirming] = useState(false);

  useCloseOnSuccess(assessState?.ok, () => setConfirming(false));

  const years = yearOptions();

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-bold">Assess dues</h2>
      <p className="mb-4 text-sm text-ink-mid">
        Charges every active student for a semester. Non-students are never
        charged, and it can only run once per semester.
      </p>

      {assessState?.error && <Notice tone="error">{assessState?.error}</Notice>}
      <Confirmation message={assessState?.ok} />
      {rateState?.error && <Notice tone="error">{rateState?.error}</Notice>}
      <Confirmation message={rateState?.ok} />

      <div className="mb-4 rounded-lg border-2 border-dashed border-stitch bg-muslin p-4">
        <p className="font-display text-base font-bold">{current.term_name}</p>
        <p className="text-sm text-ink-mid">
          {current.student_count} active student{current.student_count === 1 ? '' : 's'} ×{' '}
          <Money cents={current.dues_cents} /> ={' '}
          <span className="font-semibold text-ink"><Money cents={current.total_cents} /></span>
        </p>
        {current.already_assessed && (
          <p className="mt-2 text-xs text-kantha">
            Already assessed on{' '}
            {new Date(current.already_assessed).toLocaleDateString('en-US',
              { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      {!current.already_assessed && (
        confirming ? (
          <form action={assess}>
            <input type="hidden" name="season" value={current.season} />
            <input type="hidden" name="year" value={current.year} />
            <Notice tone="error">
              This writes {current.student_count} charges totalling{' '}
              <Money cents={current.total_cents} />. It runs once per semester and
              cannot be undone in bulk — individual charges can be waived afterwards.
            </Notice>
            <div className="flex gap-2">
              <Submit label={`Yes, charge ${current.term_name}`} />
              <button type="button" onClick={() => setConfirming(false)}
                className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setConfirming(true)}
            className="min-h-[44px] w-full rounded-lg bg-kantha px-4 text-sm font-semibold text-white">
            Charge {current.term_name}
          </button>
        )
      )}

      <hr className="stitch my-5 border-0" />

      <h3 className="mb-2 font-display text-base font-bold">Change the rate</h3>
      <p className="mb-3 text-sm text-ink-mid">
        Set per semester. Charges already written keep the amount they were
        assessed at, so past semesters are never rewritten.
      </p>

      <form action={setRate}>
        <div className="mb-4 grid gap-x-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-mid">Semester</label>
            <select name="season" defaultValue={current.season} className={sel}>
              {SEASONS.map((s) => (
                <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-mid">Year</label>
            <select name="year" defaultValue={String(current.year)} className={sel}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <Field label="New amount" name="dues" placeholder="15.00" />
        <Submit label="Update rate" variant="ghost" />
      </form>
    </Card>
  );
}
