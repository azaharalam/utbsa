'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { appeal } from '@/app/actions/inbox';
import { Notice } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import { Done } from '@/components/money/form-result';

/**
 * The way back for someone who was turned down.
 *
 * Attached to their account, so whoever reads it already has the record and
 * the reason — rather than making them explain who they are from scratch on
 * the public contact form.
 */
export default function Appeal() {
  const [state, action] = useFormState(appeal, {});
  const [open, setOpen] = useState(false);

  if (state?.ok) {
    return (
      <Done title="Sent">
        <p className="text-sm text-ink-mid">
          Somebody on the e-board will read it and get back to you by email.
        </p>
      </Done>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="min-h-[44px] rounded-lg bg-kantha px-4 text-sm font-semibold text-white">
        Ask us to look again
      </button>
    );
  }

  return (
    <form action={action}>
      {state?.error && <Notice tone="error">{state?.error}</Notice>}
      <label htmlFor="appeal" className="mb-1.5 block text-xs font-semibold text-ink-mid">
        What would you like us to know?
      </label>
      <textarea id="appeal" name="message" rows={4} required
        placeholder="Anything that might have been missed, or a correction."
        className="mb-3 w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 text-sm" />
      <div className="flex flex-wrap gap-2">
        <Submit label="Send it" />
        <button type="button" onClick={() => setOpen(false)}
          className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
          Cancel
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-mid">
        This goes to the e-board with your account attached, so they can see your
        details without you repeating them.
      </p>
    </form>
  );
}
