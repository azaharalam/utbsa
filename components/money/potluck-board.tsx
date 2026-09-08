'use client';

import { useFormState } from 'react-dom';
import { claimPotluckItem, releasePotluckItem } from '@/app/actions/potluck';
import { Card, Pill, Notice } from '@/components/ui';
import { POTLUCK_CATEGORIES, CATEGORY_LABEL } from '@/lib/potluck';
import type { PotluckItem } from '@/lib/queries/potluck';

/**
 * One tap to claim. Members type nothing — the organiser already decided
 * what is needed, and a claimed row locks with the name on it so nobody
 * duplicates.
 */
export default function PotluckBoard({
  items, meId, myHouseholdId, canClaim,
}: {
  items: PotluckItem[]; meId: string | null;
  myHouseholdId: string | null; canClaim: boolean;
}) {
  const [claimState, claim] = useFormState(claimPotluckItem, {});
  const [relState, release] = useFormState(releasePotluckItem, {});

  const open = items.filter((i) => !i.claimed_by).length;
  const err = claimState.error || relState.error;

  const mine = (i: PotluckItem) =>
    i.claimed_by === meId ||
    (!!myHouseholdId && i.claimed_household === myHouseholdId);

  const byCategory = POTLUCK_CATEGORIES
    .map((c) => ({ ...c, items: items.filter((i) => i.category === c.key) }))
    .filter((c) => c.items.length > 0);

  return (
    <Card className="mt-6">
      <h2 className="mb-1 font-display text-lg font-bold">What to bring</h2>
      <p className="mb-4 text-sm text-ink-mid">
        {open > 0
          ? `${open} ${open === 1 ? 'dish is' : 'dishes are'} still unclaimed. Tap one and it is yours — nothing to type.`
          : 'Everything is covered. Thank you.'}
      </p>

      {err && <Notice tone="error">{err}</Notice>}
      {claimState.ok && <Notice tone="success">{claimState.ok}</Notice>}

      <div className="space-y-5">
        {byCategory.map((c) => (
          <div key={c.key}>
            <h3 className="mb-2 font-display text-sm font-bold text-kantha">{c.label}</h3>
            <div className="space-y-2">
              {c.items.map((i) => {
                const taken = !!i.claimed_by;
                const isMine = mine(i);
                return (
                  <div key={i.id}
                    className={`flex flex-wrap items-center gap-3 rounded-lg border-2 border-dashed p-3 ${
                      isMine ? 'border-kantha bg-kantha-pale'
                      : taken ? 'border-stitch bg-muslin opacity-75'
                      : 'border-stitch bg-white'}`}>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{i.dish}</p>
                      <p className="text-xs text-ink-mid">
                        for about {i.covers} {i.covers === 1 ? 'person' : 'people'}
                        {i.note && ` · ${i.note}`}
                      </p>
                    </div>

                    {taken ? (
                      isMine ? (
                        <form action={release} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={i.id} />
                          <Pill tone="green">you are bringing this</Pill>
                          <button type="submit" className="text-xs text-ink-mid hover:text-alta">
                            release
                          </button>
                        </form>
                      ) : (
                        <Pill tone="grey">{i.claimed_by_name}</Pill>
                      )
                    ) : canClaim ? (
                      <form action={claim}>
                        <input type="hidden" name="id" value={i.id} />
                        <button type="submit"
                          className="min-h-[36px] rounded-lg bg-kantha px-3 text-xs font-semibold text-white">
                          I&apos;ll bring this
                        </button>
                      </form>
                    ) : (
                      <Pill tone="gold">free</Pill>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!canClaim && (
        <p className="mt-4 text-sm text-ink-mid">
          Sign in to put your name against a dish.
        </p>
      )}
    </Card>
  );
}
