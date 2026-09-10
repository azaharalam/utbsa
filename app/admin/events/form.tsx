'use client';

import { useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { saveEvent } from '@/app/actions/admin';
import { Card, Field, Button, Notice, Toggle } from '@/components/ui';
import { ResetOnSuccess, Confirmation } from '@/components/money/form-result';

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
}

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" full disabled={pending}>{pending ? 'Saving…' : 'Save event'}</Button>;
}

export default function EventForm() {
  const [state, action] = useFormState(saveEvent, {});
  const [slug, setSlug] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <h2 className="mb-4 font-display text-lg font-bold">Add an event</h2>
      {state?.error && <Notice tone="error">{state?.error}</Notice>}
      <Confirmation message={state?.ok} />

      <form action={action} ref={formRef}>
        <ResetOnSuccess ok={state?.ok} formRef={formRef} also={() => setSlug('')} />
        <div className="mb-4">
          <label htmlFor="ev-title" className="mb-1.5 block text-xs font-semibold text-ink-mid">
            Title <span className="text-alta">*</span>
          </label>
          <input
            id="ev-title" name="title" required
            onChange={(e) => setSlug(slugify(e.target.value))}
            className="w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 focus:border-kantha focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="ev-slug" className="mb-1.5 block text-xs font-semibold text-ink-mid">
            URL <span className="text-alta">*</span>
          </label>
          <div className="flex items-center gap-1 rounded-lg border border-[#D6D1C2] bg-white px-3">
            <span className="shrink-0 text-sm text-ink-mid">/events/</span>
            <input
              id="ev-slug" name="slug" required value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="w-full border-0 bg-transparent py-2.5 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Starts" name="starts_at" type="datetime-local" required />
          <Field label="Ends" name="ends_at" type="datetime-local" />
        </div>

        <Field label="Venue" name="location_name" placeholder="Wildwood Metropark, Shelter 3" />
        <Field label="Address" name="location_addr" placeholder="5100 W Central Ave, Toledo, OH" />
        <Field label="Description" name="description" as="textarea" rows={4} />

        <div className="mb-4">
          <Toggle label="Visible to the public" name="is_public" defaultChecked={true} />
          <Toggle label="This is a potluck — members bring dishes"
            name="is_potluck" defaultChecked={false} />
        </div>
        <p className="mb-4 text-xs text-ink-mid">
          Tick the potluck box and you can build the dish list once the event is saved.
        </p>

        <Submit />
      </form>
    </Card>
  );
}
