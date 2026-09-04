import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { allPosts } from '@/lib/queries/content';
import { Card, Button, Pill, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Posts' };

export default async function PostsAdmin() {
  const me = await requireAdmin();
  const posts = await allPosts(me);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Posts</h1>
        <Button href="/admin/posts/new">New post</Button>
      </div>

      {posts.length ? (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/posts/${p.id}`} className="font-display text-[15px] font-bold hover:text-kantha">
                    {p.title}
                  </Link>
                  <p className="truncate text-xs text-ink-mid">/blog/{p.slug}</p>
                </div>
                <Pill tone={p.status === 'published' ? 'green' : 'grey'}>{p.status}</Pill>
                <Link href={`/admin/posts/${p.id}`} className="text-sm font-semibold text-kantha">Edit</Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Empty
          title="No posts yet"
          body="Write up the last event while people still remember it."
          action={<Button href="/admin/posts/new">Write the first post</Button>}
        />
      )}
    </>
  );
}
