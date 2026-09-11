'use client';

import { useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import {
  addPotluckItem, duplicatePotluckItem, updatePotluckItem, removePotluckItem,
} from '@/app/actions/potluck';
import { Card, Notice, Pill } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import { ResetOnSuccess, Confirmation } from '@/components/money/form-result';
import { POTLUCK_CATEGORIES } from '@/lib/potluck';
import type { PotluckItem } from '@/lib/queries/potluck';

const CATS = POTLUCK_CATEGORIES;
const CAT_LABEL: Record<string, string> =
  Object.fromEntries(CATS.map((c) => [c.key, c.label]));

const cell = 'w-full rounded-lg border border-[#D6D1C2] bg-white px-2.5 py-2 text-sm ' +
  'focus:border-kantha focus:outline-none focus:ring-2 focus:ring-kantha/20';

/**
 * Laid out like a spreadsheet on purpose. An organiser filling this in is
 * doing data entry — twenty rows in one sitting — so the columns stay in the
 * same place and the dish field gets the room it needs.
 */
export default function PotluckEditor({
  eventId, items, expected,
}: {
  eventId: string; items: PotluckItem[]; expected: number;
}) {
  const [addState, add] = useFormState(addPotluckItem, {});
  const [dupState, duplicate] = useFormState(duplicatePotluckItem, {});
  const [editState, update] = useFormState(updatePotluckItem, {});
  const [rmState, remove] = useFormState(removePotluckItem, {});
  const [editing, setEditing] = useState<string | null>(null);
  const addRef = useRef<HTMLFormElement>(null);

  const err = addState?.error || dupState?.error || editState?.error || rmState?.error;
  const covers = items.reduce((s, i) => s + i.covers, 0);
  const claimed = items.filter((i) => i.claimed_by).length;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Potluck list</h2>
          <p className="text-sm text-ink-mid">
            You set the list; members only pick from it. Nobody cooks rice for 120 —
            put <strong>120</strong> and <strong>split 4 ways</strong> and you get four
            rows of 30, each its own dish from then on.
          </p>
        </div>
        <div className="flex gap-2">
          <Pill tone="grey">feeds about {covers}</Pill>
          <Pill tone={claimed === items.length && items.length > 0 ? 'green' : 'grey'}>
            {claimed} of {items.length} claimed
          </Pill>
        </div>
      </div>

      {err && <Notice tone="error">{err}</Notice>}
      <Confirmation message={dupState?.ok} />
      <Confirmation message={addState?.ok} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-dashed border-stitch">
              <th className="w-[16%] p-2 text-left text-xs font-semibold text-ink-mid">Category</th>
              <th className="w-[34%] p-2 text-left text-xs font-semibold text-ink-mid">Dish</th>
              <th className="w-[9%] p-2 text-left text-xs font-semibold text-ink-mid">Covers</th>
              <th className="w-[21%] p-2 text-left text-xs font-semibold text-ink-mid">Note</th>
              <th className="w-[20%] p-2 text-right text-xs font-semibold text-ink-mid">Who / actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((i) => (
              editing === i.id ? (
                <tr key={i.id} className="border-b border-muslin-deep bg-kantha-pale/40">
                  <td colSpan={5} className="p-2">
                    <form action={update} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={i.id} />
                      <input type="hidden" name="event_id" value={eventId} />
                      <select name="category" defaultValue={i.category}
                        className={`${cell} w-40`} aria-label="Category">
                        {CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                      <input name="dish" defaultValue={i.dish}
                        className={`${cell} min-w-[200px] flex-1`} aria-label="Dish" />
                      <input name="covers" type="number" min={1} max={200} defaultValue={i.covers}
                        className={`${cell} w-24`} aria-label="Covers" />
                      <input name="note" defaultValue={i.note ?? ''} placeholder="Note"
                        className={`${cell} w-48`} aria-label="Note" />
                      <Submit label="Save" />
                      <button type="button" onClick={() => setEditing(null)}
                        className="min-h-[40px] rounded-lg border-[1.5px] border-nil px-3 text-sm font-semibold text-nil">
                        Cancel
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={i.id} className="border-b border-muslin-deep last:border-0">
                  <td className="p-2 text-ink-mid">{CAT_LABEL[i.category] ?? i.category}</td>
                  <td className="p-2 font-semibold">{i.dish}</td>
                  <td className="p-2 tabular-nums">{i.covers}</td>
                  <td className="p-2 text-xs text-ink-mid">{i.note}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {i.claimed_by_name && (
                        <span className="text-xs text-kantha">{i.claimed_by_name}</span>
                      )}
                      <form action={duplicate}>
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="event_id" value={eventId} />
                        <button type="submit"
                          className="rounded-lg border border-[#D6D1C2] px-2 py-1 text-xs font-semibold hover:border-kantha hover:text-kantha">
                          Copy
                        </button>
                      </form>
                      <button onClick={() => setEditing(i.id)}
                        className="rounded-lg border border-[#D6D1C2] px-2 py-1 text-xs font-semibold hover:border-kantha hover:text-kantha">
                        Edit
                      </button>
                      {!i.claimed_by && (
                        <form action={remove}>
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="event_id" value={eventId} />
                          <button type="submit" className="px-1 text-xs text-ink-mid hover:text-alta">
                            ✕
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              )
            ))}

            {/* The add row sits in the table so the columns line up with it. */}
            <tr className="border-t-2 border-dashed border-stitch">
              <td colSpan={5} className="pt-3">
                <form action={add} ref={addRef} className="flex flex-wrap items-end gap-2">
                  <ResetOnSuccess ok={addState?.ok} formRef={addRef} />
                  <input type="hidden" name="event_id" value={eventId} />
                  <div className="w-40">
                    <label className="mb-1 block text-xs font-semibold text-ink-mid">Category</label>
                    <select name="category" className={cell}>
                      {CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="min-w-[220px] flex-1">
                    <label className="mb-1 block text-xs font-semibold text-ink-mid">Dish</label>
                    <input name="dish" required placeholder="Beef curry" className={cell} />
                  </div>
                  <div className="w-28">
                    <label className="mb-1 block text-xs font-semibold text-ink-mid">
                      For how many
                    </label>
                    <input name="covers" type="number" min={1} max={500} defaultValue={15}
                      className={cell} />
                  </div>
                  <div className="w-28">
                    <label className="mb-1 block text-xs font-semibold text-ink-mid">
                      Split
                    </label>
                    <select name="split_into" defaultValue="1" className={cell}>
                      {[1,2,3,4,5,6,8,10,12].map((n) => (
                        <option key={n} value={n}>{n === 1 ? 'no split' : `${n} ways`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-40">
                    <label className="mb-1 block text-xs font-semibold text-ink-mid">Note</label>
                    <input name="note" placeholder="Optional" className={cell} />
                  </div>
                  <Submit label="Add" />
                </form>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {!items.length && (
        <p className="mt-3 text-sm text-ink-mid">
          Nothing on the list yet. Add the first dish above, then use Copy to split
          it between several cooks.
        </p>
      )}
    </Card>
  );
}
