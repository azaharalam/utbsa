'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { assessTerm, setTermDues } from '@/app/actions/money';
import { Card, Notice, Field } from '@/components/ui';
import { Submit, Money } from '@/components/money/forms';

export default function AssessPanel({
  terms, current,
}: {
  terms: { id: string; name: string; dues_cents: number; assessed: boolean }[];
  current: {
    term_id: string; term_name: string; student_count: number;
    dues_cents: number; total_cents: number; already_assessed: string | null;
  };
}) {
  const [assessState, assess] = useFormState(assessTerm, {});
  const [rateState, setRate] = useFormState(setTermDues, {});
  const [confirming, setConfirming] = useState(false);

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-bold">Assess dues</h2>
      <p className="mb-4 text-sm text-ink-mid">
        Charges every active student for the term. Non-students are not charged.
      </p>

      {assessState.error && <Notice tone="error">{assessState.error}</Notice>}
      {assessState.ok && <Notice tone="success">{assessState.ok}</Notice>}
      {rateState.error && <Notice tone="error">{rateState.error}</Notice>}
      {rateState.ok && <Notice tone="success">{rateState.ok}</Notice>}

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
            <input type="hidden" name="term_id" value={current.term_id} />
            <Notice tone="error">
              This writes {current.student_count} charges totalling{' '}
              <Money cents={current.total_cents} />. It runs once per term and cannot be
              undone in bulk — individual charges can be waived afterwards.
            </Notice>
            <div className="flex gap-2">
              <Submit label={`Yes, assess ${current.term_name}`} />
              <button type="button" onClick={() => setConfirming(false)}
                className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setConfirming(true)}
            className="min-h-[44px] w-full rounded-lg bg-kantha px-4 text-sm font-semibold text-white">
            Assess {current.term_name}
          </button>
        )
      )}

      <hr className="stitch my-5 border-0" />

      <h3 className="mb-2 font-display text-base font-bold">Change the rate</h3>
      <p className="mb-3 text-sm text-ink-mid">
        Set per term. Charges already written keep the amount they were assessed at,
        so past semesters are never rewritten.
      </p>
      <form action={setRate}>
        <Field label="Term" name="term_id" as="select"
          options={terms.map((t) => ({ value: t.id, label: `${t.name} — $${(t.dues_cents / 100).toFixed(2)}` }))} />
        <Field label="New amount" name="dues" placeholder="15.00" />
        <Submit label="Update rate" variant="ghost" />
      </form>
    </Card>
  );
}
