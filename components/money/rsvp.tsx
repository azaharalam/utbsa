'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { setRsvp, cancelRsvp } from '@/app/actions/money';
import { Card, Notice } from '@/components/ui';
import { Submit } from '@/components/money/forms';

export default function RsvpBox({
  eventId, existing, headcount,
}: {
  eventId: string;
  existing: { guest_count: number; note: string | null } | null;
  headcount: { people: number; parties: number };
}) {
  const [saveState, save] = useFormState(setRsvp, {});
  const [cancelState, cancel] = useFormState(cancelRsvp, {});
  const [guests, setGuests] = useState(existing?.guest_count ?? 0);

  return (
    <Card className="mt-8">
      <h2 className="mb-1 font-display text-lg font-bold">
        {existing ? 'You are coming' : 'Are you coming?'}
      </h2>
      <p className="mb-4 text-sm text-ink-mid">
        {headcount.people} {headcount.people === 1 ? 'person' : 'people'} so far, across{' '}
        {headcount.parties} {headcount.parties === 1 ? 'household' : 'households'}.
        Headcount decides how much food we order, so please tell us either way.
      </p>

      {saveState.error && <Notice tone="error">{saveState.error}</Notice>}
      {saveState.ok && <Notice tone="success">{saveState.ok}</Notice>}
      {cancelState.ok && <Notice tone="info">{cancelState.ok}</Notice>}

      <form action={save}>
        <input type="hidden" name="event_id" value={eventId} />

        <label htmlFor="guest_count" className="mb-1.5 block text-xs font-semibold text-ink-mid">
          Bringing anyone? Spouse, children, a friend
        </label>
        <div className="mb-4 flex items-center gap-3">
          <button type="button" onClick={() => setGuests(Math.max(0, guests - 1))}
            aria-label="One fewer guest"
            className="h-11 w-11 rounded-lg border border-[#D6D1C2] bg-white text-lg">−</button>
          <input id="guest_count" name="guest_count" type="number" min={0} max={20}
            value={guests} onChange={(e) => setGuests(Number(e.target.value))}
            className="w-20 rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 text-center" />
          <button type="button" onClick={() => setGuests(Math.min(20, guests + 1))}
            aria-label="One more guest"
            className="h-11 w-11 rounded-lg border border-[#D6D1C2] bg-white text-lg">+</button>
          <span className="text-sm text-ink-mid">
            {guests === 0 ? 'just you' : `${guests + 1} people total`}
          </span>
        </div>

        <div className="mb-4">
          <label htmlFor="note" className="mb-1.5 block text-xs font-semibold text-ink-mid">
            Anything we should know
          </label>
          <input id="note" name="note" defaultValue={existing?.note ?? ''}
            placeholder="Dietary needs, arriving late — optional"
            className="w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5" />
        </div>

        <Submit label={existing ? 'Update my RSVP' : "I'll be there"} full />
      </form>

      {existing && (
        <form action={cancel} className="mt-3">
          <input type="hidden" name="event_id" value={eventId} />
          <button type="submit" className="text-sm text-ink-mid hover:text-alta">
            Actually, I can&apos;t make it
          </button>
        </form>
      )}
    </Card>
  );
}
