import Link from 'next/link';
import { publishedPosts } from '@/lib/queries/content';
import { Card, Pill, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Blog' };

export default async function Blog() {
  const posts = await publishedPosts();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 font-display text-3xl font-bold sm:text-4xl">Blog</h1>
      <p className="mb-8 text-ink-mid">Event write-ups, guides for new arrivals, and notices from the e-board.</p>

      {posts.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`}>
              <Card className="h-full transition-colors hover:border-kantha">
                {p.category && <Pill tone="gold">{p.category}</Pill>}
                <h2 className="mb-1.5 mt-2 font-display text-lg font-bold leading-snug">{p.title}</h2>
                <p className="mb-3 text-sm text-ink-mid">{p.excerpt}</p>
                <p className="text-xs text-ink-mid">
                  {p.author_name ? `${p.author_name} · ` : ''}
                  {p.published_at && new Date(p.published_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Empty title="No posts yet" body="Once the e-board publishes something, it shows up here." />
      )}
    </div>
  );
}
