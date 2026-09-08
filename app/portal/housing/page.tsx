import { requireApproved } from '@/lib/session';
import { housingPosts } from '@/lib/queries/community';
import HousingBoard from './board';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Housing' };

export default async function Housing() {
  const me = await requireApproved();
  const posts = await housingPosts(me);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Rooms and sublets</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-mid">
        Members only. Arrange everything directly with each other — UTBSA is not a
        party to any of it, and nobody here can vouch for a lease.
      </p>
      <HousingBoard posts={posts} meId={me.id} />
    </>
  );
}
