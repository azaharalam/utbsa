'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { advanceElection } from '@/app/actions/elections';
import { Card, Notice } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import { useCloseOnSuccess } from '@/components/money/form-result';
import type { Election } from '@/lib/queries/elections';

const FLOW = [
  ['draft', 'Draft'], ['announced', 'Announced'], ['nominations', 'Nominations'],
  ['poll_ready', 'Ballot ready'], ['voting', 'Voting'], ['closed', 'Closed'],
] as const;

const NEXT_LABEL: Record<string, string> = {
  draft: 'Announce it', announced: 'Open nominations',
  nominations: 'Close nominations', poll_ready: 'Open voting',
  voting: 'Close voting and publish results',
};

const WARNING: Record<string, string> = {
  draft: 'Announcing freezes the positions. They cannot be added or changed afterwards.',
  nominations: 'Nobody will be able to submit a nomination after this.',
  poll_ready: 'This freezes who may vote. Members joining afterwards will not be on the roll.',
  voting: 'Voting stops immediately and results become visible to every member.',
};

export default function PhaseControl({
  election, positionCount, approvedCount,
}: {
  election: Election; positionCount: number; approvedCount: number;
}) {
  const [state, action] = useFormState(advanceElection, {});
  const [confirming, setConfirming] = useState(false);

  useCloseOnSuccess(state?.ok, () => setConfirming(false));

  const idx = FLOW.findIndex(([k]) => k === election.status);
  const next = NEXT_LABEL[election.status];

  return (
    <Card>
      {state?.error && <Notice tone="error">{state?.error}</Notice>}
      {state?.ok && <Notice tone="success">{state?.ok}</Notice>}

      <ol className="mb-4 flex flex-wrap gap-1.5">
        {FLOW.map(([key, label], i) => (
          <li key={key}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
              i < idx ? 'bg-kantha-pale text-kantha'
              : i === idx ? 'bg-nil text-white'
              : 'bg-muslin-deep text-ink-mid'}`}>
            {label}
          </li>
        ))}
      </ol>

      {next && (
        confirming ? (
          <form action={action}>
            <input type="hidden" name="id" value={election.id} />
            <Notice tone="error">{WARNING[election.status]}</Notice>
            <div className="flex gap-2">
              <Submit label={`Yes — ${next.toLowerCase()}`} />
              <button type="button" onClick={() => setConfirming(false)}
                className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setConfirming(true)}
              className="min-h-[44px] rounded-lg bg-kantha px-4 text-sm font-semibold text-white">
              {next}
            </button>
            <p className="text-xs text-ink-mid">
              {election.status === 'draft' && `${positionCount} position${positionCount === 1 ? '' : 's'} defined`}
              {election.status === 'poll_ready' && `${approvedCount} approved candidate${approvedCount === 1 ? '' : 's'}`}
            </p>
          </div>
        )
      )}
    </Card>
  );
}
