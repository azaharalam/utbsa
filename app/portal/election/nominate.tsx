'use client';

import { useFormState } from 'react-dom';
import { selfNominate, withdrawNomination } from '@/app/actions/elections';
import { Card, Notice, Field, Pill } from '@/components/ui';
import { Done } from '@/components/money/form-result';
import { Submit } from '@/components/money/forms';
import type { ElectionPosition, Nomination } from '@/lib/queries/elections';

export default function NominateBox({
  electionId, positions, eligible, existing,
}: {
  electionId: string;
  positions: ElectionPosition[];
  eligible: { ok: boolean; why?: string };
  existing: Nomination | null;
}) {
  const [state, action] = useFormState(selfNominate, {});
  const [wState, withdraw] = useFormState(withdrawNomination, {});

  // Once it is in, there is nothing more to fill in here. The list refreshes
  // to show the nomination, but the form should not linger in the meantime.
  if (state?.ok) {
    return (
      <Done title="Submitted">
        <p className="text-sm text-ink-mid">
          An admin will confirm it before the ballot is built. You can withdraw
          any time before voting opens.
        </p>
      </Done>
    );
  }

  if (existing && existing.status !== 'withdrawn') {
    return (
      <Card>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="font-display text-base font-bold">You are standing</h2>
          <Pill tone={existing.status === 'approved' ? 'green'
                    : existing.status === 'declined' ? 'red' : 'gold'}>
            {existing.status}
          </Pill>
        </div>
        <p className="text-sm text-ink-mid">{existing.position_title}</p>
        {existing.statement && <p className="mt-1 text-sm">{existing.statement}</p>}
        {existing.decline_reason && (
          <p className="mt-2 text-sm text-alta">{existing.decline_reason}</p>
        )}

        {existing.status !== 'declined' && (
          <form action={withdraw} className="mt-4">
            <input type="hidden" name="id" value={existing.id} />
            {wState?.error && <Notice tone="error">{wState?.error}</Notice>}
            <button type="submit" className="text-sm text-ink-mid hover:text-alta">
              Withdraw my nomination
            </button>
          </form>
        )}
      </Card>
    );
  }

  if (!eligible?.ok) {
    return (
      <Card>
        <h2 className="mb-1 font-display text-base font-bold">Standing for office</h2>
        <p className="text-sm text-ink-mid">{eligible.why}</p>
        <p className="mt-2 text-sm text-ink-mid">
          You can still vote — every active member votes, whatever their dues.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-1 font-display text-base font-bold">Stand for a position</h2>
      <p className="mb-4 text-sm text-ink-mid">
        One position each. An admin confirms nominations before the ballot is built.
      </p>

      {state?.error && <Notice tone="error">{state?.error}</Notice>}
      {state?.ok && <Notice tone="success">{state?.ok}</Notice>}

      <form action={action}>
        <input type="hidden" name="election_id" value={electionId} />
        <Field label="Position" name="position_id" as="select"
          options={positions.map((p) => ({ value: p.id, label: p.title }))} />
        <Field label="Why you" name="statement" as="textarea" rows={3}
          placeholder="A couple of sentences members will read on the ballot." />
        <Submit label="Submit my nomination" full />
      </form>
    </Card>
  );
}
