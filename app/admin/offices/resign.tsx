'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { resignTo } from '@/app/actions/elections';
import { Card, Notice, Field } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import { useCloseOnSuccess } from '@/components/money/form-result';
import type { Office } from '@/lib/queries/offices';

/**
 * The handover. Once an election closes, the only thing a sitting officer can
 * do with their office is hand it on.
 */
export default function ResignBox({
  office, plan, electionId, members,
}: {
  office: Office;
  plan: { winner_id: string | null; winner_name: string | null; votes: number; tied: number } | null;
  electionId: string | null;
  members: { id: string; name: string }[];
}) {
  const [state, action] = useFormState(resignTo, {});
  const [open, setOpen] = useState(false);

  useCloseOnSuccess(state.ok, () => setOpen(false));

  const winner = plan?.winner_id ? { id: plan.winner_id, name: plan.winner_name! } : null;
  const tied = (plan?.tied ?? 0) > 1;

  return (
    <Card>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{state.ok}</Notice>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold">{office.title}</p>
          <p className="text-sm text-ink-mid">
            {winner
              ? tied
                ? 'The election for this position tied. Resolve it before handing over.'
                : `${winner.name} won this position with ${plan!.votes} votes.`
              : 'No election result for this position yet.'}
          </p>
        </div>
        <button onClick={() => setOpen(!open)} disabled={tied}
          className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil disabled:opacity-40">
          {open ? 'Cancel' : 'Resign and hand over'}
        </button>
      </div>

      {open && (
        <form action={action} className="mt-4 border-t-2 border-dashed border-stitch pt-4">
          <input type="hidden" name="office_id" value={office.id} />
          {electionId && <input type="hidden" name="election_id" value={electionId} />}

          <Notice tone="info">
            Your access ends immediately and theirs begins. No password is created or
            sent — they sign in with the email they already use. You stay a member,
            and everything you did stays in the record.
          </Notice>

          <Field label="Hand it to" name="successor_id" as="select"
            defaultValue={winner?.id ?? null}
            options={members.map((m) => ({ value: m.id, label: m.name }))} />

          <Submit label={`Resign as ${office.title}`} variant="danger" />
        </form>
      )}
    </Card>
  );
}
