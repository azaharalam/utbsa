'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { savePost } from '@/app/actions/admin';
import { Card, Field, Notice } from '@/components/ui';
import { Confirmation } from '@/components/money/form-result';
import type { Post } from '@/lib/types';

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
}

function Buttons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex gap-2">
      <button
        type="submit" name="publish" value="0" disabled={pending}
        className="min-h-[44px] flex-1 rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil disabled:opacity-50"
      >
        Save draft
      </button>
      <button
        type="submit" name="publish" value="1" disabled={pending}
        className="min-h-[44px] flex-1 rounded-lg bg-kantha px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Publish'}
      </button>
    </div>
  );
}

export default function PostEditor({ post }: { post?: Post | null }) {
  const [state, action] = useFormState(savePost, {});
  const [slug, setSlug] = useState(post?.slug ?? '');

  return (
    <>
      <h1 className="mb-5 font-display text-2xl font-bold sm:text-3xl">{post ? 'Edit post' : 'New post'}</h1>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Confirmation message={state.ok} />

      <form action={action}>
        <input type="hidden" name="id" value={post?.id ?? ''} />

        <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr] lg:items-start">
          <Card>
            <div className="mb-4">
              <label htmlFor="title" className="mb-1.5 block text-xs font-semibold text-ink-mid">
                Title <span className="text-alta">*</span>
              </label>
              <input
                id="title" name="title" required defaultValue={post?.title}
                onChange={(e) => { if (!post) setSlug(slugify(e.target.value)); }}
                className="w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 focus:border-kantha focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="slug" className="mb-1.5 block text-xs font-semibold text-ink-mid">
                URL <span className="text-alta">*</span>
              </label>
              <div className="flex items-center gap-1 rounded-lg border border-[#D6D1C2] bg-white px-3">
                <span className="shrink-0 text-sm text-ink-mid">/blog/</span>
                <input
                  id="slug" name="slug" required value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="w-full border-0 bg-transparent py-2.5 focus:outline-none"
                />
              </div>
            </div>

            <Field
              label="Body — Markdown" name="body" as="textarea" rows={16} defaultValue={post?.body}
              placeholder={'## A heading\n\nSome text. **Bold** works, so do [links](https://example.com) and bullet lists.'}
            />
          </Card>

          <div className="space-y-5">
            <Card>
              <Field
                label="Category" name="category" as="select" defaultValue={post?.category}
                options={[
                  { value: 'Event recap', label: 'Event recap' },
                  { value: 'Guide', label: 'Guide' },
                  { value: 'Notice', label: 'Notice' },
                  { value: 'Story', label: 'Story' },
                ]}
              />
              <Field
                label="Excerpt" name="excerpt" as="textarea" rows={3} defaultValue={post?.excerpt}
                placeholder="One line, shown on the blog list page."
              />
            </Card>
            <Buttons />
          </div>
        </div>
      </form>
    </>
  );
}
