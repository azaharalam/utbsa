'use client';

import { useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { saveEvent } from '@/app/actions/admin';
import { Card, Field, Button, Notice, Toggle } from '@/components/ui';
import { ResetOnSuccess, Confirmation } from '@/components/money/form-result';
import { POTLUCK_CATEGORIES } from '@/lib/potluck';

type Draft = { category: string; dish: string; covers: number; split: number };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
}

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" full disabled={pending}>{pending ? 'Saving…' : 'Save event'}</Button>;
}

export default function EventForm() {
  const [state, action] = useFormState(saveEvent, {});
  const [slug, setSlug] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // The dish list is built here rather than after saving, because creating an
  // event and then immediately "editing" it to add dishes reads as though you
  // did something wrong the first time.
  const [isPotluck, setIsPotluck] = useState(false);
  const [dishes, setDishes] = useState<Draft[]>([
    { category: 'rice', dish: '', covers: 15, split: 1 },
  ]);

  const setDish = (i: number, patch: Partial<Draft>) =>
    setDishes((d) => d.map((row, n) => (n === i ? { ...row, ...patch } : row)));

  const cell = 'w-full rounded-lg border border-[#D6D1C2] bg-white px-2.5 py-2 text-sm';

  return (
    <Card>
      <h2 className="mb-4 font-display text-lg font-bold">Add an event</h2>
      {state?.error && <Notice tone="error">{state?.error}</Notice>}
      <Confirmation message={state?.ok} />

      <form action={action} ref={formRef}>
        <ResetOnSuccess ok={state?.ok} formRef={formRef} also={() => setSlug('')} />
        <div className="mb-4">
          <label htmlFor="ev-title" className="mb-1.5 block text-xs font-semibold text-ink-mid">
            Title <span className="text-alta">*</span>
          </label>
          <input
            id="ev-title" name="title" required
            onChange={(e) => setSlug(slugify(e.target.value))}
            className="w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 focus:border-kantha focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="ev-slug" className="mb-1.5 block text-xs font-semibold text-ink-mid">
            URL <span className="text-alta">*</span>
          </label>
          <div className="flex items-center gap-1 rounded-lg border border-[#D6D1C2] bg-white px-3">
            <span className="shrink-0 text-sm text-ink-mid">/events/</span>
            <input
              id="ev-slug" name="slug" required value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="w-full border-0 bg-transparent py-2.5 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Starts" name="starts_at" type="datetime-local" required />
          <Field label="Ends" name="ends_at" type="datetime-local" />
        </div>

        <Field label="Venue" name="location_name" placeholder="Wildwood Metropark, Shelter 3" />
        <Field label="Address" name="location_addr" placeholder="5100 W Central Ave, Toledo, OH" />
        <Field label="Description" name="description" as="textarea" rows={4} />

        <div className="mb-4">
          <Toggle label="Visible to the public" name="is_public" defaultChecked={true} />
          <Toggle label="This is a potluck — members bring dishes"
            name="is_potluck" defaultChecked={isPotluck}
            onChange={(on: boolean) => setIsPotluck(on)} />
          <Toggle label="This is a tournament — members register to play"
            name="is_tournament" defaultChecked={false} />
        </div>

        {/* ── the dish list, while you are already here ───────── */}
        {isPotluck && (
          <div className="mb-4 rounded-lg border border-[#D6D1C2] p-3">
            <p className="mb-1 text-sm font-semibold">What should people bring?</p>
            <p className="mb-3 text-xs text-ink-mid">
              Members pick from this list — they cannot add to it. Nobody cooks rice for
              120, so put <strong>120</strong> and <strong>4 ways</strong> and you get four
              rows of 30, each its own dish from then on. You can change all of it later.
            </p>

            {dishes.map((d, i) => (
              <div key={i} className="mb-2 flex flex-wrap items-end gap-2">
                <div className="w-32">
                  <select value={d.category} className={cell}
                    onChange={(e) => setDish(i, { category: e.target.value })}
                    aria-label="Category">
                    {POTLUCK_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[10rem] flex-1">
                  <input value={d.dish} placeholder="Beef tehari" className={cell}
                    onChange={(e) => setDish(i, { dish: e.target.value })}
                    aria-label="Dish" />
                </div>
                <div className="w-24">
                  <input type="number" min={1} max={500} value={d.covers} className={cell}
                    onChange={(e) => setDish(i, { covers: Number(e.target.value) })}
                    aria-label="For how many" />
                </div>
                <div className="w-28">
                  <select value={d.split} className={cell}
                    onChange={(e) => setDish(i, { split: Number(e.target.value) })}
                    aria-label="Split">
                    {[1,2,3,4,5,6,8,10,12].map((n) => (
                      <option key={n} value={n}>{n === 1 ? 'no split' : `${n} ways`}</option>
                    ))}
                  </select>
                </div>
                {dishes.length > 1 && (
                  <button type="button" className="pb-2 text-xs text-clay"
                    onClick={() => setDishes((rows) => rows.filter((_, n) => n !== i))}>
                    remove
                  </button>
                )}
                {/* Submitted as plain fields; the action reads them by index. */}
                <input type="hidden" name={`dish_category_${i}`} value={d.category} />
                <input type="hidden" name={`dish_name_${i}`} value={d.dish} />
                <input type="hidden" name={`dish_covers_${i}`} value={d.covers} />
                <input type="hidden" name={`dish_split_${i}`} value={d.split} />
              </div>
            ))}
            <input type="hidden" name="dish_count" value={dishes.length} />

            <button type="button"
              className="mt-1 text-sm font-semibold text-kantha"
              onClick={() => setDishes((d) => [...d, { category: 'rice', dish: '', covers: 15, split: 1 }])}>
              + Another dish
            </button>
          </div>
        )}

        <p className="mb-4 text-xs text-ink-mid">
          You can add teams, or more dishes, once the event is saved.
        </p>

        {/*
          Tournament settings. The contribution and the breakdown are shown to
          players and organisers only — never on the public event page.
        */}
        <details className="mb-4 rounded-lg border border-[#D6D1C2] p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            If this is a tournament
          </summary>
          <div className="mt-3">
            <Field label="Player registration closes" name="player_reg_closes_at"
              type="datetime-local"
              hint="Usually a week before, so there is time to draw up the sides." />

            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="We ask each playing student for ($)" name="player_contribution"
                type="number"
                hint="Leave at 0 if nobody is asked for anything." />
            </div>

            <Field label="What it covers" name="cost_breakdown" as="textarea" rows={3}
              placeholder="Ground rental $180&#10;Balls and kit $25&#10;Trophy $35"
              hint="Players and organisers see this. It never appears on the public page." />
          </div>
        </details>

        <Submit />
      </form>
    </Card>
  );
}
