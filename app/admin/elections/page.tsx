import Link from 'next/link';
import { requirePermission } from '@/lib/session';
import { listElections } from '@/lib/queries/elections';
import { getSettings } from '@/lib/queries/settings';
import { nextSession, electionNameFor } from '@/lib/sessions';
import { Card, Pill, Empty } from '@/components/ui';
import NewElection from './new';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Elections' };

const tone: Record<string, string> = {
  draft: 'grey', announced: 'gold', nominations: 'gold',
  poll_ready: 'gold', voting: 'green', closed: 'grey',
};

const label: Record<string, string> = {
  draft: 'draft', announced: 'announced', nominations: 'taking nominations',
  poll_ready: 'ballot ready', voting: 'voting open', closed: 'closed',
};

export default async function Elections() {
  await requirePermission('elections');
  const [list, settings] = await Promise.all([listElections(), getSettings()]);
  const upcoming = nextSession(settings.current_session);
  const exists = list.some((e) => e.session === upcoming);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Elections</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-mid">
        The e-board serves a session, so an election is always for the next one.
        The current board is {settings.current_session}; this election picks the
        board for <strong>{upcoming}</strong>. Positions freeze the moment it is
        announced, so nothing shifts underneath the people standing in it.
      </p>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <div className="space-y-3">
          {list.length ? list.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/elections/${e.id}`}
                    className="font-display text-[15px] font-bold hover:text-kantha">
                    {e.name}
                  </Link>
                  <p className="text-xs text-ink-mid">
                    {e.session}
                    {e.voting_open_on && ` · voting ${new Date(e.voting_open_on).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`}
                    {e.voting_close_on && `–${new Date(e.voting_close_on).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`}
                  </p>
                </div>
                <Pill tone={tone[e.status]}>{label[e.status]}</Pill>
                <Link href={`/admin/elections/${e.id}`}
                  className="text-sm font-semibold text-kantha">Open</Link>
              </div>
            </Card>
          )) : (
            <Empty title="No elections yet"
              body="Create one as a draft, add the positions, then announce it when you are ready." />
          )}
        </div>

        <NewElection session={upcoming} name={electionNameFor(upcoming)} exists={exists} />
      </div>
    </>
  );
}
