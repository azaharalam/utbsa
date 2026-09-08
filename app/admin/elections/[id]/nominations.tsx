'use client';

import { useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import { nominateMember, decideNomination } from '@/app/actions/elections';
import { Card, Notice, Field, Pill, Avatar } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import { ResetOnSuccess, Confirmation } from '@/components/money/form-result';
import type { Nomination, ElectionPosition } from '@/lib/queries/elections';

const tone: Record<string, string> = {
  pending: 'gold', approved: 'green', declined: 'red', withdrawn: 'grey',
};

export default function NominationList({
  electionId, nominations, positions, members, canAdd, canDecide,
}: {
  electionId: string; nominations: Nomination[]; positions: ElectionPosition[];
  members: { id: string; name: string }[];
  canAdd: boolean; canDecide: boolean;
}) {
  const [addState, add] = useFormState(nominateMember, {});
  const [decState, decide] = useFormState(decideNomination, {});
  const [declining, setDeclining] = useState<string | null>(null);

  return (
    <>
      {addState.error && <Notice tone="error">{addState.error}</Notice>}
      <Confirmation message={addState.ok} />
      {decState.error && <Notice tone="error">{decState.error}</Notice>}

      <div className="mb-4 space-y-2">
        {nominations.map((n) => (
          <Card key={n.id} className="p-3">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar name={n.member_name} size={34} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold">{n.member_name}</p>
                <p className="text-xs text-kantha">{n.position_title}</p>
                {n.statement && <p className="mt-1 text-xs text-ink-mid">{n.statement}</p>}
                <p className="mt-0.5 text-xs text-ink-mid">
                  {n.created_by ? 'nominated by an admin' : 'stood themselves'}
                </p>
                {n.decline_reason && (
                  <p className="mt-1 text-xs text-alta">{n.decline_reason}</p>
                )}
              </div>

              {n.status === 'pending' && canDecide ? (
                <div className="flex gap-2">
                  <form action={decide}>
                    <input type="hidden" name="id" value={n.id} />
                    <input type="hidden" name="election_id" value={electionId} />
                    <input type="hidden" name="decision" value="approved" />
                    <button type="submit"
                      className="min-h-[36px] rounded-lg bg-kantha px-3 text-xs font-semibold text-white">
                      Approve
                    </button>
                  </form>
                  <button onClick={() => setDeclining(declining === n.id ? null : n.id)}
                    className="min-h-[36px] rounded-lg border-[1.5px] border-nil px-3 text-xs font-semibold text-nil">
                    Decline
                  </button>
                </div>
              ) : (
                <Pill tone={tone[n.status]}>{n.status}</Pill>
              )}
            </div>

            {declining === n.id && (
              <form action={decide} className="mt-3 flex gap-2 border-t-2 border-dashed border-stitch pt-3">
                <input type="hidden" name="id" value={n.id} />
                <input type="hidden" name="election_id" value={electionId} />
                <input type="hidden" name="decision" value="declined" />
                <input name="reason" required placeholder="Reason — the candidate sees this"
                  className="flex-1 rounded-lg border border-[#D6D1C2] bg-white px-3 py-2 text-sm" />
                <Submit label="Decline" variant="danger" />
              </form>
            )}
          </Card>
        ))}
      </div>

      {canAdd && (
        <Card>
          <h3 className="mb-1 font-display text-sm font-bold">Nominate someone</h3>
          <p className="mb-3 text-xs text-ink-mid">
            Recorded as an admin nomination, so it is never mistaken for someone
            putting themselves forward.
          </p>
          <form action={add}>
            <input type="hidden" name="election_id" value={electionId} />
            <Field label="Member" name="member_id" as="select"
              options={members.map((m) => ({ value: m.id, label: m.name }))} />
            <Field label="Position" name="position_id" as="select"
              options={positions.map((p) => ({ value: p.id, label: p.title }))} />
            <Field label="Statement" name="statement" as="textarea" rows={2}
              placeholder="Optional" />
            <Submit label="Add nomination" full />
          </form>
        </Card>
      )}
    </>
  );
}
