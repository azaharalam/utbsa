'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { castBallot } from '@/app/actions/elections';
import { Card, Notice } from '@/components/ui';
import { useCloseOnSuccess } from '@/components/money/form-result';
import { Submit } from '@/components/money/forms';
import type { ElectionPosition, Nomination } from '@/lib/queries/elections';

export default function BallotBox({
  electionId, positions, nominations,
}: {
  electionId: string; positions: ElectionPosition[]; nominations: Nomination[];
}) {
  const [state, action] = useFormState(castBallot, {});
  const [confirming, setConfirming] = useState(false);

  useCloseOnSuccess(state.ok, () => setConfirming(false));

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-bold">Your ballot</h2>
      <p className="mb-4 text-sm text-ink-mid">
        One choice per position, or abstain. You can only vote once, and it cannot be
        changed afterwards — so take a moment.
      </p>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{state.ok}</Notice>}

      <form action={action}>
        <input type="hidden" name="election_id" value={electionId} />

        {positions.map((p) => {
          const candidates = nominations.filter((n) => n.position_id === p.id);
          return (
            <fieldset key={p.id} className="mb-5 border-t-2 border-dashed border-stitch pt-4 first:border-t-0 first:pt-0">
              <legend className="mb-2 font-display text-base font-bold">{p.title}</legend>

              {candidates.length ? (
                <div className="space-y-2">
                  {candidates.map((n) => (
                    <label key={n.id}
                      className="flex cursor-pointer gap-3 rounded-lg border-2 border-dashed border-stitch p-3 hover:border-kantha">
                      <input type="radio" name={`position_${p.id}`} value={n.id}
                        className="mt-1 h-4 w-4 shrink-0 accent-[#1F6F55]" />
                      <span>
                        <span className="block font-semibold">{n.member_name}</span>
                        {n.statement && (
                          <span className="block text-sm text-ink-mid">{n.statement}</span>
                        )}
                      </span>
                    </label>
                  ))}
                  <label className="flex cursor-pointer gap-3 rounded-lg border-2 border-dashed border-stitch p-3 hover:border-kantha">
                    <input type="radio" name={`position_${p.id}`} value="abstain"
                      defaultChecked className="mt-1 h-4 w-4 shrink-0 accent-[#1F6F55]" />
                    <span className="text-ink-mid">Abstain</span>
                  </label>
                </div>
              ) : (
                <p className="text-sm text-ink-mid">Nobody is standing for this position.</p>
              )}
            </fieldset>
          );
        })}

        {confirming ? (
          <>
            <Notice tone="error">
              Once submitted this cannot be changed or withdrawn.
            </Notice>
            <div className="flex gap-2">
              <Submit label="Cast my vote" />
              <button type="button" onClick={() => setConfirming(false)}
                className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
                Go back
              </button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)}
            className="min-h-[44px] w-full rounded-lg bg-kantha px-4 text-sm font-semibold text-white">
            Review and submit
          </button>
        )}
      </form>

      <p className="mt-4 text-xs text-ink-mid">
        Your ballot is stored with no link to your account. The system records that you
        voted, never what you chose — not even for an administrator.
      </p>
    </Card>
  );
}
