'use client';

import { useFormState } from 'react-dom';
import { claimPotluckItem } from '@/app/actions/potluck';
import { Notice } from '@/components/ui';
import type { PotluckItem } from '@/lib/queries/potluck';

/**
 * Claim a dish from the dashboard. One tap, no navigation, no typing.
 * Shows a few of the unclaimed ones rather than the whole list.
 */
export default function QuickPotluck({
  items, mine, eventSlug,
}: {
  items: PotluckItem[]; mine: PotluckItem[]; eventSlug: string;
}) {
  const [state, claim] = useFormState(claimPotluckItem, {});
  const open = items.filter((i) => !i.claimed_by).slice(0, 4);

  if (mine.length > 0) {
    return (
      <p className="text-sm">
        <span className="font-semibold text-kantha">You&apos;re bringing</span>{' '}
        {mine.map((d) => d.dish).join(', ')}
        {open.length > 0 && (
          <a href={`/events/${eventSlug}`} className="ml-2 text-xs text-ink-mid hover:text-kantha">
            {open.length} more still needed →
          </a>
        )}
      </p>
    );
  }

  if (!open.length) return null;

  return (
    <div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{state.ok}</Notice>}

      <p className="mb-2 text-sm text-ink-mid">
        Still needed — tap one and it&apos;s yours:
      </p>
      <div className="flex flex-wrap gap-2">
        {open.map((i) => (
          <form key={i.id} action={claim}>
            <input type="hidden" name="id" value={i.id} />
            <button type="submit"
              className="min-h-[36px] rounded-lg border-2 border-dashed border-stitch bg-white px-3 text-xs font-semibold hover:border-kantha hover:text-kantha">
              {i.dish}
              <span className="ml-1.5 font-normal text-ink-mid">for {i.covers}</span>
            </button>
          </form>
        ))}
        <a href={`/events/${eventSlug}`}
          className="inline-flex min-h-[36px] items-center px-2 text-xs font-semibold text-kantha">
          see all →
        </a>
      </div>
    </div>
  );
}
