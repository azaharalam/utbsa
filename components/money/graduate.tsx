'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { requestStatusChange } from '@/app/actions/money';
import { Card, Notice, Field } from '@/components/ui';
import { Submit } from '@/components/money/forms';

export default function GraduateBox({ memberType }: { memberType: string }) {
  const [state, action] = useFormState(requestStatusChange, {});
  const [open, setOpen] = useState(false);

  if (memberType !== 'student') return null;

  return (
    <Card className="mt-5">
      <h2 className="mb-1 font-display text-base font-bold">Finished your degree?</h2>
      <p className="mb-3 text-sm text-ink-mid">
        Let us know and an admin will move you to alumni. You stay in the directory
        and keep coming to everything — you just stop being charged semester dues.
      </p>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{state.ok}</Notice>}

      {open ? (
        <form action={action}>
          <input type="hidden" name="to_type" value="alumni" />
          <Field label="Anything to add" name="reason" placeholder="Graduating December 2027 — optional" />
          <div className="flex gap-2">
            <Submit label="Send request" />
            <button type="button" onClick={() => setOpen(false)}
              className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setOpen(true)}
          className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
          I&apos;ve graduated
        </button>
      )}
    </Card>
  );
}
