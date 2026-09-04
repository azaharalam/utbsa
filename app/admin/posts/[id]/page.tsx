import { requireAdmin } from '@/lib/session';
import { postById } from '@/lib/queries/content';
import PostEditor from './editor';

export const dynamic = 'force-dynamic';

export default async function EditPost({ params }: { params: { id: string } }) {
  const me = await requireAdmin();
  if (params.id === 'new') return <PostEditor />;

  const post = await postById(me, params.id);
  return <PostEditor post={post} />;
}
