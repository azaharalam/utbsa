'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { setRsvp, cancelRsvp } from '@/app/actions/money';
import { Card, Notice } from '@/components/ui';
import { Confirmation } from '@/components/money/form-result';
import { Submit } from '@/components/money/forms';
import { CHILD_MIN_AGE } from '@/lib/potluck';
import AddToCalendar from '@/components/money/add-to-calendar';
import type { CalendarEvent } from '@/lib/calendar';

function Counter({
  label, hint, name, value, setValue, min,
}: {
  label: string; hint?: string; name: string;
  value: number; setValue: (n: number) => void; min: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-ink-mid">{label}</label>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setValue(Math.max(min, value - 1))}
          aria-label={`One fewer ${label}`}
          className="h-11 w-11 shrink-0 rounded-lg border border-[#D6D1C2] bg-white text-lg">−</button>
        <input name={name} type="number" min={min} max={20} value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-16 rounded-lg border border-[#D6D1C2] bg-white px-2 py-2.5 text-center" />
        <button type="button" onClick={() => setValue(Math.min(20, value + 1))}
          aria-label={`One more ${label}`}
          className="h-11 w-11 shrink-0 rounded-lg border border-[#D6D1C2] bg-white text-lg">+</button>
      </div>
      {hint && <p className="mt-1 text-xs text-ink-mid">{hint}</p>}
    </div>
  );
}

export default function RsvpBox({
  eventId, existing, headcount, household, answeredBy, calendar, slug,
}: {
  eventId: string;
  existing: { adults: number; children: number; note: string | null } | null;
  headcount: { people: number; households: number; adults: number; children: number };
  household: { id: string; full_name: string }[];
  answeredBy: string | null;   // set when someone else in the household answered
  calendar: CalendarEvent;
  slug: string;
}) {
  const [saveState, save] = useFormState(setRsvp, {});
  const [cancelState, cancel] = useFormState(cancelRsvp, {});
  const [adults, setAdults] = useState(existing?.adults ?? Math.max(1, household.length || 1));
  const [children, setChildren] = useState(existing?.children ?? 0);

  return (
    <Card className="mt-8">
      <h2 className="mb-1 font-display text-lg font-bold">
        {existing ? 'You are coming' : 'Are you coming?'}
      </h2>

      {/* The household case: somebody has already answered for both of you. */}
      {answeredBy && (
        <Notice tone="info">
          <strong>{answeredBy}</strong> has already answered for your household.
          You can change it here — there is only one answer between you.
        </Notice>
      )}

      <p className="mb-4 text-sm text-ink-mid">
        {headcount.people} {headcount.people === 1 ? 'person' : 'people'} so far, from{' '}
        {headcount.households} {headcount.households === 1 ? 'household' : 'households'}.
        The headcount decides how much food we order, so please say either way.
      </p>

      {saveState.error && <Notice tone="error">{saveState.error}</Notice>}
      <Confirmation message={saveState.ok} />
      <Confirmation message={cancelState.ok} />

      <form action={save}>
        <input type="hidden" name="event_id" value={eventId} />

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <Counter
            label="Adults" name="adults" value={adults} setValue={setAdults} min={1}
            hint={household.length > 1
              ? `Including everyone in your household — ${household.map((h) => h.full_name.split(' ')[0]).join(' and ')}`
              : 'Including you'}
          />
          <Counter
            label="Children" name="children" value={children} setValue={setChildren} min={0}
            hint={`${CHILD_MIN_AGE} and over. Younger ones eat off your plate, so leave them out.`}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="note" className="mb-1.5 block text-xs font-semibold text-ink-mid">
            Anything we should know
          </label>
          <input id="note" name="note" defaultValue={existing?.note ?? ''}
            placeholder="Dietary needs, arriving late — optional"
            className="w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5" />
        </div>

        <Submit label={existing ? 'Update' : "We'll be there"} full />
      </form>

      {/* Saying yes is the moment to put it in their calendar. */}
      {existing && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t-2 border-dashed border-stitch pt-4">
          <AddToCalendar event={calendar} slug={slug} />
          <span className="text-xs text-ink-mid">
            So it is on your phone, not just on this page.
          </span>
        </div>
      )}

      {existing && (
        <form action={cancel} className="mt-3">
          <input type="hidden" name="event_id" value={eventId} />
          <button type="submit" className="text-sm text-ink-mid hover:text-alta">
            Actually, we can&apos;t make it
          </button>
        </form>
      )}
    </Card>
  );
}
