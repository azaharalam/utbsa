'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { saveSponsor } from '@/app/actions/sponsors';
import { Card, Pill, Notice, Field, Toggle } from '@/components/ui';
import { useCloseOnSuccess } from '@/components/money/form-result';
import { Submit, Money } from '@/components/money/forms';

export default function SponsorRow({ sponsor }: { sponsor: any }) {
  const [state, action] = useFormState(saveSponsor, {});
  const [open, setOpen] = useState(false);

  useCloseOnSuccess(state?.ok, () => setOpen(false));

  return (
    <Card>
      {state?.error && <Notice tone="error">{state?.error}</Notice>}
      {state?.ok && <Notice tone="success">{state?.ok}</Notice>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-bold">
            {sponsor.public_name || sponsor.name}
            {sponsor.public_name && (
              <span className="ml-2 text-xs font-normal text-ink-mid">
                (recorded as {sponsor.name})
              </span>
            )}
          </p>
          <p className="text-xs text-ink-mid">
            {sponsor.type} · {sponsor.gift_count} gift{sponsor.gift_count === 1 ? '' : 's'}
            {sponsor.email && ` · ${sponsor.email}`}
          </p>
        </div>

        <span className="font-display text-base font-bold"><Money cents={sponsor.total_cents} /></span>

        <Pill tone={sponsor.show_publicly ? 'green' : 'grey'}>
          {sponsor.is_anonymous ? 'anonymous' : sponsor.tier.label}
        </Pill>

        <button onClick={() => setOpen(!open)}
          className="min-h-[36px] rounded-lg border-[1.5px] border-nil px-3 text-xs font-semibold text-nil">
          {open ? 'Close' : 'Edit'}
        </button>
      </div>

      {open && (
        <form action={action} className="mt-4 border-t-2 border-dashed border-stitch pt-4">
          <input type="hidden" name="id" value={sponsor.id} />

          <div className="mb-3">
            <Toggle label="Show on the public sponsors page"
              name="show_publicly" defaultChecked={sponsor.show_publicly} />
          </div>

          <Field label="Name to display" name="public_name" defaultValue={sponsor.public_name}
            placeholder={sponsor.name}
            hint="Leave blank to use the recorded name. Useful for a trading name." />
          <Field label="Website" name="website" defaultValue={sponsor.website}
            placeholder="https://" />
          <Field label="One line about them" name="blurb" defaultValue={sponsor.blurb}
            placeholder="Optional — e.g. 'Catered Boishakh three years running'" />

          <Submit label="Save" />
        </form>
      )}
    </Card>
  );
}
