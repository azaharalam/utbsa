'use client';

import { useFormState } from 'react-dom';
import { saveSettings } from '@/app/actions/money';
import { Card, Notice, Field } from '@/components/ui';
import { Confirmation } from '@/components/money/form-result';
import { Submit } from '@/components/money/forms';
import type { Settings } from '@/lib/money';
import { sessionOptions, nextSession } from '@/lib/sessions';

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action] = useFormState(saveSettings, {});

  return (
    <>
      <h1 className="mb-5 font-display text-2xl font-bold sm:text-3xl">Settings</h1>

      {state?.error && <Notice tone="error">{state?.error}</Notice>}
      <Confirmation message={state?.ok} />

      <Card className="mb-5 max-w-xl">
        <h2 className="mb-1 font-display text-lg font-bold">Current session</h2>
        <p className="mb-4 text-sm text-ink-mid">
          The e-board serves a full academic year, not a semester. This is the board
          currently in office; the next election automatically runs for{' '}
          <strong>{nextSession(settings.current_session)}</strong>.
        </p>
        <form action={action}>
          <Field label="Session" name="current_session" as="select"
            defaultValue={settings.current_session}
            options={sessionOptions(settings.current_session).map((s) => ({ value: s, label: s }))} />
          <Submit label="Save session" variant="ghost" />
        </form>
      </Card>

      <Card className="max-w-xl">
        <h2 className="mb-1 font-display text-lg font-bold">How members send money</h2>
        <p className="mb-4 text-sm text-ink-mid">
          The university does not allow us to take card payments through the website, so
          dues arrive by bank transfer. These details appear in dues emails and on the
          page members land on when they click the link.
        </p>

        <form action={action}>
          <Field label="Method" name="pay_method_label" defaultValue={settings.pay_method_label}
            hint="Shown as 'Send it by …'" />
          <Field label="Account name" name="pay_to_name" defaultValue={settings.pay_to_name} />
          <Field label="Send to" name="pay_to_handle" defaultValue={settings.pay_to_handle}
            hint="The email address or phone number members transfer to." />
          <Field label="Instructions" name="pay_instructions" as="textarea" rows={3}
            defaultValue={settings.pay_instructions} />

          <Notice tone="info">
            Nothing a member submits changes their balance on its own. A transaction ID is
            a claim — the treasurer matches it against the account and confirms it from{' '}
            <strong>Transfers</strong>, and only then does a payment exist.
          </Notice>

          <Submit label="Save settings" />
        </form>
      </Card>
    </>
  );
}
