'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { setRsvp } from '@/app/actions/money';
import { Notice } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import { useCloseOnSuccess } from '@/components/money/form-result';

/**
 * RSVP without leaving the dashboard.
 *
 * The old version linked out to the event page, which meant three taps to
 * answer a yes/no question. Most people are answering for themselves alone,
 * so that is the default and the counters are only there if they need them.
 */
export default function QuickRsvp({
  eventId, householdSize, answered, answeredBy, adults: a0, children: c0,
}: {
  eventId: string; householdSize: number;
  answered: boolean; answeredBy: string | null;
  adults: number; children: number;
}) {
  const [state, action] = useFormState(setRsvp, {});
  const [open, setOpen] = useState(false);
  const [adults, setAdults] = useState(a0 || Math.max(1, householdSize));
  const [children, setChildren] = useState(c0);

  useCloseOnSuccess(state?.ok, () => setOpen(false));

  const step = (set: (n: number) => void, v: number, d: number, min: number) =>
    () => set(Math.max(min, Math.min(20, v + d)));

  if (answered && !open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-kantha-pale px-3 py-1 text-xs font-semibold text-kantha">
          You&apos;re going{adults - 1 + children > 0 && ` · ${adults + children} of you`}
        </span>
        {answeredBy && (
          <span className="text-xs text-ink-mid">{answeredBy} answered for you</span>
        )}
        <button onClick={() => setOpen(true)} className="text-xs font-semibold text-kantha">
          change
        </button>
      </div>
    );
  }

  return (
    <div>
      {state?.error && <Notice tone="error">{state?.error}</Notice>}
      {state?.ok && <Notice tone="success">{state?.ok}</Notice>}

      <form action={action}>
        <input type="hidden" name="event_id" value={eventId} />
        <input type="hidden" name="adults" value={adults} />
        <input type="hidden" name="children" value={children} />

        {!open ? (
          <div className="flex flex-wrap items-center gap-2">
            <Submit label={householdSize > 1 ? "We'll be there" : "I'll be there"} />
            <button type="button" onClick={() => setOpen(true)}
              className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-3 text-sm font-semibold text-nil">
              Bringing others
            </button>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-stitch bg-white p-3">
            <div className="mb-3 flex flex-wrap gap-4">
              {[
                { label: 'Adults', v: adults, set: setAdults, min: 1 },
                { label: 'Children 3+', v: children, set: setChildren, min: 0 },
              ].map((f) => (
                <div key={f.label}>
                  <p className="mb-1 text-xs font-semibold text-ink-mid">{f.label}</p>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={step(f.set, f.v, -1, f.min)}
                      aria-label={`One fewer ${f.label}`}
                      className="h-9 w-9 rounded-lg border border-[#D6D1C2] bg-white">−</button>
                    <span className="w-8 text-center font-display text-lg font-bold">{f.v}</span>
                    <button type="button" onClick={step(f.set, f.v, 1, f.min)}
                      aria-label={`One more ${f.label}`}
                      className="h-9 w-9 rounded-lg border border-[#D6D1C2] bg-white">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Submit label={`${adults + children} of us are coming`} />
              <button type="button" onClick={() => setOpen(false)}
                className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-3 text-sm font-semibold text-nil">
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
