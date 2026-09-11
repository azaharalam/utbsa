import { requirePermission } from '@/lib/session';
import { messages, filteredCount } from '@/lib/queries/inbox';
import { Card, Pill, Empty } from '@/components/ui';
import MessageRow from './row';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Messages' };

export default async function Messages({
  searchParams,
}: {
  searchParams: { all?: string; filtered?: string };
}) {
  const me = await requirePermission('members');
  const showAll = searchParams.all === '1';
  const showSpam = searchParams.filtered === '1';
  const [list, filtered] = await Promise.all([
    messages(me, showAll || showSpam, showSpam),
    filteredCount(me),
  ]);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Messages</h1>
      <p className="mb-4 max-w-2xl text-sm text-ink-mid">
        Sent through the contact form on the public site. Reply from your own email —
        marking one as done just takes it off this list so two people do not answer it.
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        <a href="/admin/messages">
          <Pill tone={!showAll && !showSpam ? 'green' : 'grey'}>Open</Pill>
        </a>
        <a href="/admin/messages?all=1">
          <Pill tone={showAll && !showSpam ? 'green' : 'grey'}>Everything</Pill>
        </a>
        <a href="/admin/messages?filtered=1">
          <Pill tone={showSpam ? 'green' : 'grey'}>
            Filtered{filtered > 0 && ` (${filtered})`}
          </Pill>
        </a>
      </div>

      {showSpam && (
        <p className="mb-4 rounded-lg border-2 border-dashed border-[#D6D1C2] px-4 py-3 text-sm text-ink-mid">
          These looked like sales pitches, so they are kept out of the main list rather than
          deleted. If something real is in here, it is still here — reply as normal.
        </p>
      )}

      {list.length ? (
        <div className="space-y-3">{list.map((m) => <MessageRow key={m.id} message={m} />)}</div>
      ) : (
        <Empty title={showSpam ? 'Nothing filtered' : showAll ? 'No messages' : 'Nothing waiting'}
          body={showSpam
            ? 'Sales pitches and the like would be collected here.'
            : 'Messages from the contact form land here.'} />
      )}
    </>
  );
}
