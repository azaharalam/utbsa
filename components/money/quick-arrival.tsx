'use client';

import { useFormState } from 'react-dom';
import { claimArrival } from '@/app/actions/community';
import { Notice } from '@/components/ui';
import type { ArrivalSummary } from '@/lib/queries/community';

/** Volunteer to meet someone, from the dashboard. */
export default function QuickArrival({ arrivals }: { arrivals: ArrivalSummary[] }) {
  const [state, claim] = useFormState(claimArrival, {});
  const open = arrivals.filter((a) => a.status === 'open').slice(0, 3);
  if (!open.length) return null;

  return (
    <div>
      {state?.error && <Notice tone="error">{state?.error}</Notice>}
      {state?.ok && <Notice tone="success">{state?.ok}</Notice>}

      <div className="space-y-2">
        {open.map((a) => {
          const days = Math.ceil(
            (new Date(a.arriving_on).getTime() - Date.now()) / 864e5
          );
          return (
            <div key={a.id} className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{a.first_name}</span>
                  {a.people_count > 1 && ` and ${a.people_count - 1} other`}
                  {' lands at '}{a.airport}
                  <span className="text-ink-mid">
                    {days <= 0 ? ' today' : days === 1 ? ' tomorrow' : ` in ${days} days`}
                  </span>
                </p>
              </div>
              <form action={claim}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit"
                  className="min-h-[36px] rounded-lg bg-kantha px-3 text-xs font-semibold text-white">
                  I&apos;ll meet them
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
