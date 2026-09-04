import Link from 'next/link';
import { notFound } from 'next/navigation';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { postBySlug } from '@/lib/queries/content';
import { Pill, Avatar } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await postBySlug(params.slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/blog" className="mb-6 inline-block text-sm text-kantha">← All posts</Link>

      {post.category && <Pill tone="green">{post.category}</Pill>}
      <h1 className="mb-4 mt-3 font-display text-3xl font-bold leading-tight sm:text-[2.5rem]">{post.title}</h1>

      <div className="mb-8 flex items-center gap-3">
        <Avatar name={post.author_name ?? 'UTBSA'} url={post.author_photo} size={36} />
        <p className="text-sm text-ink-mid">
          {post.author_name ?? 'UTBSA'}
          {post.published_at &&
            ` · ${new Date(post.published_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        </p>
      </div>

      <div
        className="space-y-4 text-[15px] leading-relaxed
                   [&_a]:text-kantha [&_a]:underline
                   [&_h2]:pt-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold
                   [&_h3]:pt-3 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-bold
                   [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5
                   [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5
                   [&_blockquote]:border-l-4 [&_blockquote]:border-kantha [&_blockquote]:pl-4 [&_blockquote]:text-ink-mid"
      >
        <Markdown remarkPlugins={[remarkGfm]}>{post.body}</Markdown>
      </div>
    </article>
  );
}
