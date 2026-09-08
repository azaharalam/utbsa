'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { assignArrival, unassignArrival } from '@/app/actions/community';
import { Notice, Pill, Avatar } from '@/components/ui';
import { useCloseOnSuccess } from '@/components/money/form-result';

function Go({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="min-h-[44px] rounded-lg bg-kantha px-4 text-sm font-semibold text-white disabled:opacity-50">
      {pending ? 'Saving…' : label}
    </button>
  );
}

/**
 * Sits in its own band across the bottom of the card, not squeezed into a
 * corner. A member picker with fifteen names needs room to be read — cramming
 * it beside the flight details made it look like part of the record rather
 * than something you were being asked to do.
 */
export default function Assign({
  arrival, candidates,
}: {
  arrival: any;
  candidates: { id: string; full_name: string; taken: number }[];
}) {
  const [assignState, assign] = useFormState(assignArrival, {});
  const [dropState, drop] = useFormState(unassignArrival, {});
  const [open, setOpen] = useState(false);

  const err = assignState.error || dropState.error;
  const closed = arrival.status === 'done' || arrival.status === 'cancelled';

  /**
   * Collapse once the assignment lands. Leaving the picker open afterwards
   * shows a dropdown for a job already done — it reads as though nothing
   * happened, and invites assigning the same person twice.
   */
  useCloseOnSuccess(assignState.ok, () => setOpen(false));

  const band = 'mt-3 border-t-2 border-dashed border-stitch pt-3';

  if (closed) {
    return (
      <div className={band}>
        <Pill tone={arrival.status === 'done' ? 'grey' : 'red'}>{arrival.status}</Pill>
      </div>
    );
  }

  // ── open: the picker gets the full width of the card ──
  if (open) {
    return (
      <div className={band}>
        {err && <Notice tone="error">{err}</Notice>}

        <form action={assign}>
          <input type="hidden" name="id" value={arrival.id} />

          <label htmlFor={`who-${arrival.id}`}
            className="mb-1.5 block text-xs font-semibold text-ink-mid">
            Who should meet {arrival.full_name.split(' ')[0]}?
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select id={`who-${arrival.id}`} name="member_id" required
              defaultValue={arrival.claimed_by ?? ''}
              className="min-h-[44px] flex-1 rounded-lg border border-[#D6D1C2] bg-white px-3 text-sm">
              <option value="" disabled>Choose a member…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                  {c.taken > 0 && ` — ${c.taken} pickup${c.taken === 1 ? '' : 's'} already`}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <Go label={arrival.claimed_by ? 'Reassign' : 'Assign'} />
              <button type="button" onClick={() => setOpen(false)}
                className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
                Cancel
              </button>
            </div>
          </div>

          <p className="mt-2 text-xs text-ink-mid">
            They will be emailed the flight details, and can release it from their
            portal if they cannot make it. Worth asking first — it hands them a
            stranger&apos;s phone number.
          </p>
        </form>
      </div>
    );
  }

  // ── assigned ──
  if (arrival.claimed_by) {
    return (
      <div className={band}>
        {err && <Notice tone="error">{err}</Notice>}
        {assignState.ok && <Notice tone="success">{assignState.ok}</Notice>}
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={arrival.claimed_by_name ?? '?'} size={28} />
          <span className="text-sm">
            <span className="font-semibold">{arrival.claimed_by_name}</span>
            <span className="text-ink-mid"> is meeting them</span>
          </span>
          <div className="ml-auto flex gap-3">
            <button onClick={() => setOpen(true)} className="text-xs font-semibold text-kantha">
              Reassign
            </button>
            <form action={drop}>
              <input type="hidden" name="id" value={arrival.id} />
              <button type="submit" className="text-xs text-ink-mid hover:text-alta">
                Unassign
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── nobody yet ──
  return (
    <div className={band}>
      {err && <Notice tone="error">{err}</Notice>}
      {dropState.ok && <Notice tone="info">{dropState.ok}</Notice>}
      <div className="flex flex-wrap items-center gap-3">
        <Pill tone="gold">nobody assigned</Pill>
        <span className="text-sm text-ink-mid">
          Members can also volunteer themselves from the portal.
        </span>
        <button onClick={() => setOpen(true)}
          className="ml-auto min-h-[40px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
          Assign someone
        </button>
      </div>
    </div>
  );
}
