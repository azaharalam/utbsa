'use client';

import { useFormState } from 'react-dom';
import { saveSettings } from '@/app/actions/money';
import { Card, Notice, Field, Toggle } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import type { Settings } from '@/lib/money';

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action] = useFormState(saveSettings, {});

  return (
    <>
      <h1 className="mb-5 font-display text-2xl font-bold sm:text-3xl">Settings</h1>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{state.ok}</Notice>}

      <Card className="max-w-xl">
        <h2 className="mb-1 font-display text-lg font-bold">Payments</h2>
        <p className="mb-4 text-sm text-ink-mid">
          Leave this off until the university confirms UTBSA may use an outside payment
          processor. Recording payments by hand and importing spreadsheets works either
          way, so the treasurer is never blocked by this switch.
        </p>

        <form action={action}>
          <div className="mb-4">
            <Toggle label="Accept card payments online"
              name="payments_enabled" defaultChecked={settings.payments_enabled} />
          </div>

          <Field label="Who covers the card fee" name="fee_mode" as="select"
            defaultValue={settings.fee_mode}
            hint="Stripe takes about 2.9% + 30¢. On $15 dues that is roughly 74¢."
            options={[
              { value: 'absorb', label: 'UTBSA absorbs it — member pays $15.00' },
              { value: 'pass_through', label: 'Member pays it — checkout shows $15.74' },
              { value: 'optional', label: 'Optional checkbox at checkout' },
            ]} />

          <Notice tone="info">
            At around 100 members plus a few ticketed events, absorbing the fee costs
            roughly <strong>$200–300 a year</strong>. Worth showing the treasurer before
            it shows up in the books.
          </Notice>

          <Submit label="Save settings" />
        </form>
      </Card>
    </>
  );
}
