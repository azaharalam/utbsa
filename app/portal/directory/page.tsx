import { requireApproved } from '@/lib/session';
import { directory } from '@/lib/queries/members';
import DirectoryList from './list';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Directory' };

export default async function Directory() {
  const me = await requireApproved();

  // Everyone who opted in. Searching happens in the browser — the query
  // already strips anything a member chose not to share, so there is nothing
  // here that should not be on the page.
  const members = await directory(me);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Member directory</h1>
      <p className="mb-5 text-sm text-ink-mid">
        {members.length} {members.length === 1 ? 'member has' : 'members have'} chosen to be listed.
      </p>

      <DirectoryList members={members} />
    </>
  );
}
