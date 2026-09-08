'use client';

import { useRef } from 'react';

import { useFormState } from 'react-dom';
import { createElection } from '@/app/actions/elections';
import { Card, Notice, Field } from '@/components/ui';
import { ResetOnSuccess, Confirmation } from '@/components/money/form-result';
import { Submit } from '@/components/money/forms';

export default function NewElection({
  session, name, exists,
}: {
  session: string; name: string; exists: boolean;
}) {
  const [state, action] = useFormState(createElection, {});
  const formRef = useRef<HTMLFormElement>(null);

  if (exists) {
    return (
      <Card>
        <h2 className="mb-1 font-display text-lg font-bold">Next election</h2>
        <p className="text-sm text-ink-mid">
          The {session} election already exists — open it from the list.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-bold">New election</h2>
      <p className="mb-4 text-sm text-ink-mid">
        Set the dates and it starts as a draft. Positions can only be added or
        removed while it is a draft — once announced, the list is fixed.
      </p>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Confirmation message={state.ok} />

      <div className="mb-4 rounded-lg border-2 border-dashed border-kantha bg-kantha-pale p-3">
        <p className="font-display text-base font-bold">{name}</p>
        <p className="text-xs text-ink-mid">
          Named automatically — an election is always for the session after the
          one currently running.
        </p>
      </div>

      <form action={action} ref={formRef}>
        <ResetOnSuccess ok={state.ok} formRef={formRef} />
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Nominations open" name="nominations_open_on" type="date" />
          <Field label="Nominations close" name="nominations_close_on" type="date" />
          <Field label="Voting opens" name="voting_open_on" type="date" />
          <Field label="Voting closes" name="voting_close_on" type="date"
            hint="Usually seven days after it opens." />
        </div>

        <Submit label="Create draft" full />
      </form>
    </Card>
  );
}
