'use client';

import { useRef, useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { postHousing, closeHousing } from '@/app/actions/community';
import { Card, Field, Notice, Pill, Empty } from '@/components/ui';
import { ResetOnSuccess, Confirmation } from '@/components/money/form-result';
import { Submit, Money } from '@/components/money/forms';
import type { HousingPost } from '@/lib/queries/community';

const KINDS = [
  { value: 'offering', label: 'Room available' },
  { value: 'seeking', label: 'Looking for a room' },
  { value: 'sublet', label: 'Sublet' },
];

export default function HousingBoard({ posts, meId }: { posts: HousingPost[]; meId: string }) {
  const [postState, post] = useFormState(postHousing, {});
  const [closeState, close] = useFormState(closeHousing, {});
  const [filter, setFilter] = useState('all');
  const formRef = useRef<HTMLFormElement>(null);

  const shown = filter === 'all' ? posts : posts.filter((p) => p.kind === filter);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
      <div>
        {closeState?.error && <Notice tone="error">{closeState?.error}</Notice>}

        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={() => setFilter('all')}>
            <Pill tone={filter === 'all' ? 'green' : 'grey'}>Everything</Pill>
          </button>
          {KINDS.map((k) => (
            <button key={k.value} onClick={() => setFilter(k.value)}>
              <Pill tone={filter === k.value ? 'green' : 'grey'}>{k.label}</Pill>
            </button>
          ))}
        </div>

        {shown.length ? (
          <div className="space-y-3">
            {shown.map((p) => (
              <Card key={p.id}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="font-display text-base font-bold">{p.title}</p>
                      <Pill tone={p.kind === 'offering' ? 'green' : 'grey'}>
                        {KINDS.find((k) => k.value === p.kind)?.label}
                      </Pill>
                    </div>
                    <p className="text-xs text-ink-mid">
                      {p.area && `${p.area} · `}
                      {p.available_from && `from ${new Date(p.available_from).toLocaleDateString('en-US',
                        { day: 'numeric', month: 'short' })} · `}
                      {p.poster_name}
                    </p>
                    {p.description && <p className="mt-1 text-sm text-ink-mid">{p.description}</p>}
                    {p.poster_email && (
                      <a href={`mailto:${p.poster_email}`}
                        className="mt-2 inline-block text-sm font-semibold text-kantha">
                        Get in touch
                      </a>
                    )}
                  </div>

                  <div className="text-right">
                    {p.rent_cents != null && (
                      <p className="font-display text-base font-bold">
                        <Money cents={p.rent_cents} />
                        <span className="text-xs font-normal text-ink-mid"> /mo</span>
                      </p>
                    )}
                    {p.posted_by === meId && (
                      <form action={close} className="mt-2">
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="text-xs text-ink-mid hover:text-alta">
                          Take down
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty title="Nothing posted" body="Post a room or say you are looking for one." />
        )}
      </div>

      <Card>
        <h2 className="mb-1 font-display text-lg font-bold">Post</h2>
        <p className="mb-4 text-sm text-ink-mid">
          Members can see your email if you have that switched on in your profile.
        </p>

        {postState?.error && <Notice tone="error">{postState?.error}</Notice>}
        <Confirmation message={postState?.ok} />

        <form action={post} ref={formRef}>
          <ResetOnSuccess ok={postState?.ok} formRef={formRef} />
          <Field label="What" name="kind" as="select" options={KINDS} />
          <Field label="Title" name="title" required
            placeholder="Room in a 2-bed near campus" />
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Area" name="area" placeholder="Old Orchard" />
            <Field label="Rent per month" name="rent" placeholder="450.00" />
          </div>
          <Field label="Available from" name="available_from" type="date" />
          <Field label="Details" name="description" as="textarea" rows={3}
            placeholder="Bus route, utilities, who else lives there, any preferences" />
          <Submit label="Post it" full />
        </form>
      </Card>
    </div>
  );
}
