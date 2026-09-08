'use client';

import { useRef, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { postJob, closeJob } from '@/app/actions/community';
import { Card, Field, Notice, Pill, Empty } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import { ResetOnSuccess, Confirmation } from '@/components/money/form-result';
import type { JobPost } from '@/lib/queries/community';

const KINDS = [
  { value: 'full_time', label: 'Full time' },
  { value: 'internship', label: 'Internship' },
  { value: 'part_time', label: 'Part time' },
  { value: 'assistantship', label: 'Assistantship' },
  { value: 'referral', label: 'Referral offer' },
];

export default function JobBoard({ posts, meId }: { posts: JobPost[]; meId: string }) {
  const [postState, post] = useFormState(postJob, {});
  const [closeState, close] = useFormState(closeJob, {});
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
      <div>
        {closeState.error && <Notice tone="error">{closeState.error}</Notice>}

        {posts.length ? (
          <div className="space-y-3">
            {posts.map((j) => (
              <Card key={j.id}>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="font-display text-base font-bold">{j.title}</p>
                  <Pill tone={j.kind === 'referral' ? 'gold' : 'grey'}>
                    {KINDS.find((k) => k.value === j.kind)?.label}
                  </Pill>
                </div>
                <p className="text-sm text-ink-mid">
                  {j.organisation}{j.location && ` · ${j.location}`}
                </p>
                {j.description && <p className="mt-2 text-sm">{j.description}</p>}
                <p className="mt-2 text-xs text-ink-mid">
                  posted by {j.poster_name}
                  {j.closes_on && ` · closes ${new Date(j.closes_on).toLocaleDateString('en-US',
                    { day: 'numeric', month: 'short' })}`}
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {j.link && (
                    <a href={j.link} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold text-kantha">Apply</a>
                  )}
                  {j.posted_by === meId && (
                    <form action={close}>
                      <input type="hidden" name="id" value={j.id} />
                      <button type="submit" className="text-sm text-ink-mid hover:text-alta">
                        Take down
                      </button>
                    </form>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty title="Nothing posted"
            body="Know of an opening, or willing to refer someone at your company? Post it." />
        )}
      </div>

      <Card>
        <h2 className="mb-1 font-display text-lg font-bold">Post an opening</h2>
        <p className="mb-4 text-sm text-ink-mid">
          Only members see this board.
        </p>

        {postState.error && <Notice tone="error">{postState.error}</Notice>}
        <Confirmation message={postState.ok} />

        <form action={post} ref={formRef}>
          <ResetOnSuccess ok={postState.ok} formRef={formRef} />
          <Field label="Role" name="title" required placeholder="Software Engineer, new grad" />
          <Field label="Organisation" name="organisation" required placeholder="Owens Corning" />
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Location" name="location" placeholder="Toledo, OH" />
            <Field label="Type" name="kind" as="select" options={KINDS} />
          </div>
          <Field label="Link" name="link" placeholder="https://..." />
          <Field label="Details" name="description" as="textarea" rows={3}
            placeholder="What they want, whether you can refer, anything useful" />
          <Field label="Closes on" name="closes_on" type="date"
            hint="Optional. It disappears from the board after this." />
          <Submit label="Post it" full />
        </form>
      </Card>
    </div>
  );
}
