'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import {
  inviteToHousehold, respondToHouseholdInvite,
  cancelHouseholdInvite, leaveHousehold,
} from '@/app/actions/potluck';
import { Card, Field, Notice, Avatar } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import { useCloseOnSuccess } from '@/components/money/form-result';
import type { HouseholdMember, HouseholdInvite } from '@/lib/queries/households';

/**
 * Linking two accounts as one household. Consented in both directions —
 * otherwise anyone could declare themselves your spouse and start answering
 * invitations for you.
 */
export default function HouseholdBox({
  meId, household, incoming, outgoing, members,
}: {
  meId: string;
  household: HouseholdMember[];
  incoming: HouseholdInvite[];
  outgoing: HouseholdInvite[];
  members: { id: string; name: string }[];
}) {
  const [inviteState, invite] = useFormState(inviteToHousehold, {});
  const [respondState, respond] = useFormState(respondToHouseholdInvite, {});
  const [cancelState, cancelInv] = useFormState(cancelHouseholdInvite, {});
  const [leaveState, leave] = useFormState(leaveHousehold, {});
  const [open, setOpen] = useState(false);

  useCloseOnSuccess(inviteState?.ok, () => setOpen(false));

  const others = household.filter((h) => h.id !== meId);
  const err = inviteState?.error || respondState?.error || cancelState?.error || leaveState?.error;

  return (
    <Card className="mt-5">
      <h2 className="mb-1 font-display text-base font-bold">Household</h2>
      <p className="mb-3 text-sm text-ink-mid">
        Link your account with your spouse or family so one of you answers an
        invitation for both, and you get one email per event rather than two.
        <strong> Dues are not affected</strong> — those stay separate.
      </p>

      {err && <Notice tone="error">{err}</Notice>}
      {inviteState?.ok && <Notice tone="success">{inviteState?.ok}</Notice>}
      {respondState?.ok && <Notice tone="success">{respondState?.ok}</Notice>}
      {leaveState?.ok && <Notice tone="info">{leaveState?.ok}</Notice>}

      {incoming.map((i) => (
        <div key={i.id} className="mb-3 rounded-lg border-2 border-dashed border-kantha bg-kantha-pale p-3">
          <p className="mb-1 text-sm">
            <strong>{i.from_name}</strong> would like to link your accounts as one household.
          </p>
          {i.message && <p className="mb-2 text-sm text-ink-mid">&ldquo;{i.message}&rdquo;</p>}
          <div className="flex gap-2">
            <form action={respond}>
              <input type="hidden" name="id" value={i.id} />
              <input type="hidden" name="accept" value="1" />
              <button type="submit"
                className="min-h-[40px] rounded-lg bg-kantha px-3 text-sm font-semibold text-white">
                Accept
              </button>
            </form>
            <form action={respond}>
              <input type="hidden" name="id" value={i.id} />
              <input type="hidden" name="accept" value="0" />
              <button type="submit"
                className="min-h-[40px] rounded-lg border-[1.5px] border-nil px-3 text-sm font-semibold text-nil">
                No thanks
              </button>
            </form>
          </div>
        </div>
      ))}

      {others.length > 0 ? (
        <>
          <div className="mb-3 space-y-2">
            {others.map((h) => (
              <div key={h.id} className="flex items-center gap-3">
                <Avatar name={h.full_name} url={h.photo_url} size={34} />
                <span className="text-sm font-semibold">{h.full_name}</span>
              </div>
            ))}
          </div>
          <form action={leave}>
            <button type="submit" className="text-sm text-ink-mid hover:text-alta">
              Unlink our accounts
            </button>
          </form>
        </>
      ) : outgoing.length > 0 ? (
        outgoing.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-ink-mid">Waiting for {o.to_name} to accept.</span>
            <form action={cancelInv}>
              <input type="hidden" name="id" value={o.id} />
              <button type="submit" className="text-ink-mid hover:text-alta">Withdraw</button>
            </form>
          </div>
        ))
      ) : open ? (
        <form action={invite}>
          <Field label="Who" name="member_id" as="select"
            options={members.map((m) => ({ value: m.id, label: m.name }))} />
          <Field label="A note, if you like" name="message"
            placeholder="Optional — e.g. 'my wife'" />
          <div className="flex gap-2">
            <Submit label="Ask them" />
            <button type="button" onClick={() => setOpen(false)}
              className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setOpen(true)}
          className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
          Link with someone
        </button>
      )}
    </Card>
  );
}
