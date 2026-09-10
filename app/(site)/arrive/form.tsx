'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { submitArrival } from '@/app/actions/community';
import { Card, Field, Notice, Toggle } from '@/components/ui';
import { Submit } from '@/components/money/forms';

export default function ArrivalForm() {
  const [state, action] = useFormState(submitArrival, {});
  const [pickup, setPickup] = useState(true);

  return (
    <Card>
      {state?.error && <Notice tone="error">{state?.error}</Notice>}

      <form action={action}>
        <Field label="Your name" name="full_name" required placeholder="Rafid Hossain" />
        <Field label="Email" name="email" type="email" required
          hint="So we can confirm who is meeting you." />
        <Field label="Phone or WhatsApp" name="phone"
          hint="Optional, but it is how your driver will find you at the airport." />

        <hr className="stitch my-4 border-0" />

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Date you land" name="arriving_on" type="date" required />
          <Field label="Time you land" name="arriving_at" type="time" />
          <Field label="Airport" name="airport" as="select" defaultValue="DTW"
            options={[
              { value: 'DTW', label: 'Detroit (DTW)' },
              { value: 'TOL', label: 'Toledo (TOL)' },
              { value: 'CLE', label: 'Cleveland (CLE)' },
              { value: 'ORD', label: 'Chicago (ORD)' },
            ]} />
          <Field label="Flight number" name="flight_no" placeholder="QR 725" />
          <Field label="How many of you" name="people_count" type="number" defaultValue="1" />
          <Field label="Luggage" name="luggage_note" placeholder="Two large suitcases" />
        </div>

        <hr className="stitch my-4 border-0" />

        <p className="mb-2 text-xs font-semibold text-ink-mid">What would help</p>
        <div className="mb-4" onChange={(e) => {
          const t = e.target as HTMLInputElement;
          if (t.name === 'needs_pickup') setPickup(t.checked);
        }}>
          <Toggle label="A lift from the airport" name="needs_pickup" defaultChecked={true} />
          <Toggle label="Somewhere to stay for the first few nights" name="needs_stay" defaultChecked={false} />
          <Toggle label="Help with the first grocery and bedding run" name="needs_shopping" defaultChecked={false} />
        </div>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Program" name="program" placeholder="MS / PhD / BS" />
          <Field label="Department" name="department" placeholder="Computer Science" />
        </div>

        <Field label="Anything else" name="note" as="textarea" rows={2}
          placeholder="Optional — travelling with family, dietary needs, anything worth knowing" />

        <input type="text" name="website" tabIndex={-1} autoComplete="off"
          aria-hidden="true" className="absolute -left-[9999px] h-0 w-0" />

        <Submit label="Send it" full />
      </form>
    </Card>
  );
}
