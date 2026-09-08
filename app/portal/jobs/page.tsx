import { requireApproved } from '@/lib/session';
import { jobPosts } from '@/lib/queries/community';
import JobBoard from './board';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Jobs' };

export default async function Jobs() {
  const me = await requireApproved();
  const posts = await jobPosts(me);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Jobs and referrals</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-mid">
        Openings members know about, and alumni willing to refer. A referral from
        someone inside is worth more than a hundred cold applications, so if you can
        offer one, post it.
      </p>
      <JobBoard posts={posts} meId={me.id} />
    </>
  );
}
