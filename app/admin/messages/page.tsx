import { requirePermission } from '@/lib/session';
import { messages } from '@/lib/queries/inbox';
import { Card, Pill, Empty } from '@/components/ui';
import MessageRow from './row';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Messages' };

export default async function Messages({ searchParams }: { searchParams: { all?: string } }) {
  const me = await requirePermission('members');
  const showAll = searchParams.all === '1';
  const list = await messages(me, showAll);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Messages</h1>
      <p className="mb-4 max-w-2xl text-sm text-ink-mid">
        Sent through the contact form on the public site. Reply from your own email —
        marking one as done just takes it off this list so two people do not answer it.
      </p>

      <div className="mb-5 flex gap-2">
        <a href="/admin/messages"><Pill tone={showAll ? 'grey' : 'green'}>Open</Pill></a>
        <a href="/admin/messages?all=1"><Pill tone={showAll ? 'green' : 'grey'}>Everything</Pill></a>
      </div>

      {list.length ? (
        <div className="space-y-3">{list.map((m) => <MessageRow key={m.id} message={m} />)}</div>
      ) : (
        <Empty title={showAll ? 'No messages' : 'Nothing waiting'}
          body="Messages from the contact form land here." />
      )}
    </>
  );
}
