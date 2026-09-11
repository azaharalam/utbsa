'use client';

import { useFormState } from 'react-dom';
import { checkInRsvp } from '@/app/actions/inbox';
import { Card, Pill, Avatar, Notice } from '@/components/ui';
import type { HouseholdRsvp } from '@/lib/queries/tickets';

/**
 * `started` gates the Arrived buttons.
 *
 * Before the event there is nobody to tick off, and a row of live buttons
 * next to every name is an invitation to tap one by accident — at which point
 * the list says somebody is here who is still at home, and the only way back
 * is the database.
 */
export default function CheckInList({
  eventId, rsvps, started = true,
}: {
  eventId: string; rsvps: HouseholdRsvp[]; started?: boolean;
}) {
  const [state, action] = useFormState(checkInRsvp, {});
  const arrived = rsvps.filter((r) => r.checked_in_at).length;

  return (
    <>
      {state?.error && <Notice tone="error">{state?.error}</Notice>}
      <p className="mb-3 text-sm text-ink-mid">
        {started
          ? `${arrived} of ${rsvps.length} arrived`
          : `${rsvps.length} expected — you can tick people off once it starts`}
      </p>

      <div className="space-y-2">
        {rsvps.map((r) => (
          <Card key={r.id} className={`p-3 ${r.checked_in_at ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-center gap-3">
              <Avatar name={r.member_name} size={34} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold">
                  {r.household_names ?? r.member_name}
                  <span className="ml-2 font-normal text-ink-mid">
                    {r.adults} adult{r.adults === 1 ? '' : 's'}
                    {r.children > 0 && `, ${r.children} child${r.children === 1 ? '' : 'ren'}`}
                  </span>
                </p>
                {r.note && <p className="text-xs text-ink-mid">{r.note}</p>}
              </div>

              {r.checked_in_at ? (
                <Pill tone="green">here</Pill>
              ) : !started ? null : (
                <form action={action}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="event_id" value={eventId} />
                  <button type="submit"
                    className="min-h-[36px] rounded-lg border-[1.5px] border-nil px-3 text-xs font-semibold text-nil">
                    Arrived
                  </button>
                </form>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
