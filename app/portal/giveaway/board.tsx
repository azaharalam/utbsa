'use client';

import { useRef, useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { postGiveaway, claimGiveaway, setGiveawayStatus } from '@/app/actions/community';
import { Card, Field, Notice, Pill, Empty } from '@/components/ui';
import { ResetOnSuccess, Confirmation } from '@/components/money/form-result';
import { Submit, Money } from '@/components/money/forms';
import type { GiveawayItem } from '@/lib/queries/community';

const CATEGORIES = [
  { value: 'furniture', label: 'Furniture' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bedding', label: 'Bedding' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'books', label: 'Books' },
  { value: 'winter', label: 'Winter clothes' },
  { value: 'other', label: 'Other' },
];

export default function GiveawayBoard({ items, meId }: { items: GiveawayItem[]; meId: string }) {
  const [postState, post] = useFormState(postGiveaway, {});
  const [claimState, claim] = useFormState(claimGiveaway, {});
  const [statusState, setStatus] = useFormState(setGiveawayStatus, {});
  const [filter, setFilter] = useState('all');
  const formRef = useRef<HTMLFormElement>(null);

  const shown = filter === 'all' ? items : items.filter((i) => i.category === filter);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
      <div>
        {claimState.error && <Notice tone="error">{claimState.error}</Notice>}
        <Confirmation message={claimState.ok} />
        {statusState.error && <Notice tone="error">{statusState.error}</Notice>}

        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={() => setFilter('all')}>
            <Pill tone={filter === 'all' ? 'green' : 'grey'}>Everything</Pill>
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setFilter(c.value)}>
              <Pill tone={filter === c.value ? 'green' : 'grey'}>{c.label}</Pill>
            </button>
          ))}
        </div>

        {shown.length ? (
          <div className="space-y-3">
            {shown.map((i) => (
              <Card key={i.id} className={i.status === 'claimed' ? 'opacity-70' : ''}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-bold">{i.title}</p>
                    <p className="text-xs text-ink-mid">
                      {CATEGORIES.find((c) => c.value === i.category)?.label}
                      {i.condition && ` · ${i.condition}`} · {i.poster_name}
                    </p>
                    {i.description && <p className="mt-1 text-sm text-ink-mid">{i.description}</p>}
                  </div>

                  <div className="text-right">
                    <p className="font-display text-base font-bold">
                      {i.price_cents === 0 ? 'Free' : <Money cents={i.price_cents} />}
                    </p>
                    {i.status === 'available' && i.posted_by !== meId && (
                      <form action={claim} className="mt-2">
                        <input type="hidden" name="id" value={i.id} />
                        <button type="submit"
                          className="min-h-[36px] rounded-lg bg-kantha px-3 text-xs font-semibold text-white">
                          I&apos;ll take it
                        </button>
                      </form>
                    )}
                    {i.status === 'claimed' && (
                      <Pill tone="gold">
                        {i.claimed_by === meId ? 'yours' : `${i.claimed_by_name?.split(' ')[0]} has it`}
                      </Pill>
                    )}
                    {i.posted_by === meId && i.status !== 'gone' && (
                      <form action={setStatus} className="mt-2">
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="status" value="gone" />
                        <button type="submit" className="text-xs text-ink-mid hover:text-alta">
                          Mark gone
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty title="Nothing listed"
            body="Leaving soon? Post what you cannot take with you — someone arriving in August will be very glad." />
        )}
      </div>

      <Card>
        <h2 className="mb-1 font-display text-lg font-bold">List something</h2>
        <p className="mb-4 text-sm text-ink-mid">
          Whoever claims it arranges collection with you directly.
        </p>

        {postState.error && <Notice tone="error">{postState.error}</Notice>}
        <Confirmation message={postState.ok} />

        <form action={post} ref={formRef}>
          <ResetOnSuccess ok={postState.ok} formRef={formRef} />
          <Field label="What is it" name="title" required placeholder="IKEA desk and chair" />
          <Field label="Category" name="category" as="select" options={CATEGORIES} />
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Condition" name="condition" as="select"
              options={[
                { value: 'new', label: 'As new' },
                { value: 'good', label: 'Good' },
                { value: 'worn', label: 'Worn but works' },
              ]} />
            <Field label="Price" name="price" placeholder="0.00"
              hint="Leave at 0 to give it away." />
          </div>
          <Field label="Details" name="description" as="textarea" rows={2}
            placeholder="Size, colour, where to collect it from" />
          <Submit label="List it" full />
        </form>
      </Card>
    </div>
  );
}
