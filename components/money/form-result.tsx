'use client';

import { useRef, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Notice } from '@/components/ui';

/**
 * ─────────────────────────────────────────────────────────────
 * WHAT A FORM DOES AFTER IT SUCCEEDS
 *
 * There is no single right answer, so there are three, and every form in the
 * app picks one deliberately:
 *
 *   create   The fields empty and a short confirmation appears above them.
 *            They are about to add another dish, another payment, another
 *            listing. Leaving the old values there means editing them by hand
 *            or, worse, submitting the same thing twice.
 *
 *   edit     The fields keep what was saved, and a confirmation appears.
 *            Clearing a profile form after saving would look like the save
 *            had wiped everything.
 *
 *   once     The form is replaced entirely by the success message. There is
 *            nothing more to do here — a contact form, a signup, an arrival
 *            request. Flipping the whole panel is right precisely because
 *            nothing follows.
 * ─────────────────────────────────────────────────────────────
 */
export type FormMode = 'create' | 'edit' | 'once';

/** Clears the form after a successful create. Render inside the <form>. */
export function ResetOnSuccess({
  ok, formRef, also,
}: {
  ok?: string; formRef: React.RefObject<HTMLFormElement>; also?: () => void;
}) {
  const { pending } = useFormStatus();
  const seen = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (ok && !pending && seen.current !== ok) {
      seen.current = ok;
      formRef.current?.reset();
      also?.();
    }
  }, [ok, pending, formRef, also]);

  return null;
}

/**
 * A confirmation that fades out on its own after a few seconds, so it does
 * not sit there implying the last thing you did is still the current state.
 */
export function Confirmation({ message, tone = 'success' }: {
  message?: string; tone?: 'success' | 'info';
}) {
  const [shown, setShown] = useState<string | undefined>(message);

  useEffect(() => {
    setShown(message);
    if (!message) return;
    const t = setTimeout(() => setShown(undefined), 6000);
    return () => clearTimeout(t);
  }, [message]);

  if (!shown) return null;
  return <Notice tone={tone === 'info' ? 'info' : 'success'}>{shown}</Notice>;
}

/**
 * Close a panel once its action succeeds.
 *
 * A form that stays open after it worked shows controls for a job already
 * done — it reads as though nothing happened, and invites doing it twice.
 * Success should look like cancel: back to the settled view, now changed.
 *
 *   useCloseOnSuccess(state.ok, () => setOpen(false));
 *
 * The ref confines this to the transition, so a re-render cannot reopen and
 * re-close in a loop.
 */
export function useCloseOnSuccess(ok: string | undefined, close: () => void) {
  const handled = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (ok && handled.current !== ok) {
      handled.current = ok;
      close();
    }
    // `close` is a setter wrapper and stable enough; keying on `ok` is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);
}

/** For `once` forms: swap the whole panel out. */
export function Done({
  title, children,
}: {
  title: string; children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-kantha bg-kantha-pale p-5">
      <h3 className="mb-1 font-display text-lg font-bold">{title}</h3>
      {children}
    </div>
  );
}
