'use client';

import { useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import { Card, Field, Button, Notice, Toggle } from '@/components/ui';
import { ResetOnSuccess, Confirmation, useCloseOnSuccess } from '@/components/money/form-result';
import { addMemberByOfficer } from '@/app/actions/admin';

/**
 * Adding somebody by hand, off a sign-up sheet.
 *
 * Collapsed by default. This is the uncommon path — people normally join
 * themselves — and an open form at the top of the members list would suggest
 * otherwise.
 */
export default function AddMember() {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(addMemberByOfficer, {});
  const formRef = useRef<HTMLFormElement>(null);

  useCloseOnSuccess(state?.ok, () => setOpen(false));

  if (!open) {
    return (
      <div className="mb-5">
        {/* Button is for submits and links, so this one is plain, styled to match. */}
        <button type="button" onClick={() => setOpen(true)}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border-[1.5px] border-nil px-4 py-2.5 text-sm font-semibold text-nil transition-colors hover:bg-nil hover:text-white">
          Add someone by hand
        </button>
        <Confirmation message={state?.ok} />
      </div>
    );
  }

  return (
    <Card className="mb-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Add someone by hand</h2>
        <button type="button" onClick={() => setOpen(false)}
          className="text-xs font-semibold text-ink-mid hover:text-ink">
          Cancel
        </button>
      </div>
      <p className="mb-4 text-sm text-ink-mid">
        For names off a sign-up sheet. They go straight in as active, and we email them a
        link to finish their own profile. Everything else they fill in themselves.
      </p>

      {state?.error && <Notice tone="error">{state?.error}</Notice>}

      <form ref={formRef} action={action}>
        <ResetOnSuccess ok={state?.ok} formRef={formRef} />

        <Field label="Full name" name="full_name" required
          placeholder="As they wrote it" />

        <Field label="Personal email" name="personal_email" type="email" required
          placeholder="name@gmail.com"
          hint="Not their UToledo address. The university holds back our mail, so nothing would reach them." />

        <Field label="Phone" name="phone" placeholder="Optional" />

        <div className="mb-4">
          <Toggle label="Currently a student at UToledo" name="is_student"
            defaultChecked={true} />
        </div>
        <p className="mb-4 text-xs text-ink-mid">
          Leave it off for alumni, spouses, faculty and everyone else. It decides whether
          we ask them for a contribution, so it is worth getting right.
        </p>

        <Button type="submit">Add and send the link</Button>
      </form>
    </Card>
  );
}
