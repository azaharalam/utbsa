'use client';

import { useRef } from 'react';

import { useFormState } from 'react-dom';
import { addPosition, removePosition } from '@/app/actions/elections';
import { Card, Notice, Field, Pill } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import { ResetOnSuccess, Confirmation } from '@/components/money/form-result';
import { PERMISSION_SETS } from '@/lib/permission-sets';
import type { ElectionPosition } from '@/lib/queries/elections';

export default function PositionManager({
  electionId, positions, editable,
}: {
  electionId: string; positions: ElectionPosition[]; editable: boolean;
}) {
  const [addState, add] = useFormState(addPosition, {});
  const [rmState, rm] = useFormState(removePosition, {});

  return (
    <>
      {addState?.error && <Notice tone="error">{addState?.error}</Notice>}
      {rmState?.error && <Notice tone="error">{rmState?.error}</Notice>}

      <div className="mb-4 space-y-2">
        {positions.map((p) => (
          <Card key={p.id} className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold">{p.title}</p>
                <p className="text-xs text-ink-mid">
                  {PERMISSION_SETS[p.permission_set]?.description}
                </p>
              </div>
              <Pill tone={p.permission_set === 'full' ? 'gold' : 'grey'}>
                {PERMISSION_SETS[p.permission_set]?.label}
              </Pill>
              {editable && (
                <form action={rm}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="election_id" value={electionId} />
                  <button type="submit" className="text-xs font-semibold text-alta">Remove</button>
                </form>
              )}
            </div>
          </Card>
        ))}
        {!positions.length && (
          <p className="text-sm text-ink-mid">No positions yet.</p>
        )}
      </div>

      {editable && (
        <Card>
          <form action={add}>
            <input type="hidden" name="election_id" value={electionId} />
            <Field label="Title" name="title" required placeholder="Media Officer" />
            <Field label="What they can do" name="permission_set" as="select"
              hint="Access follows the office, so this is what the winner will be able to do."
              options={Object.entries(PERMISSION_SETS).map(([k, v]) => ({
                value: k, label: `${v.label} — ${v.description}`,
              }))} />
            <Submit label="Add position" full />
          </form>
        </Card>
      )}
    </>
  );
}
