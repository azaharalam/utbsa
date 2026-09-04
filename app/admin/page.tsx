import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { statusCounts } from '@/lib/queries/members';
import { allPosts, allEvents, unhandledMessageCount, currentTerm } from '@/lib/queries/content';
import { Card, Notice } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin' };

export default async function AdminHome() {
  const me = await requireAdmin();
  const [counts, posts, events, messages, term] = await Promise.all([
    statusCounts(me), allPosts(me), allEvents(me), unhandledMessageCount(me), currentTerm(),
  ]);

  const tiles = [
    { n: counts.pending ?? 0, label: 'Waiting for approval', href: '/admin/approvals', urgent: (counts.pending ?? 0) > 0 },
    { n: counts.active ?? 0, label: 'Active members', href: '/admin/members' },
    { n: posts.filter((p) => p.status === 'published').length, label: 'Published posts', href: '/admin/posts' },
    { n: events.length, label: 'Events', href: '/admin/events' },
    { n: messages, label: 'Unread messages' },
  ];

  return (
    <>
      <h1 className="mb-5 font-display text-2xl font-bold sm:text-3xl">Overview</h1>

      {!term && (
        <Notice tone="error">
          No current term is set. Events will not be filed against a semester until you set one.
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => {
          const body = (
            <Card className={`h-full p-4 ${t.urgent ? 'border-genda bg-[#FDF8EC]' : ''}`}>
              <p className="font-display text-3xl font-bold leading-tight text-nil">{t.n}</p>
              <p className="text-xs text-ink-mid">{t.label}</p>
            </Card>
          );
          return t.href ? <Link key={t.label} href={t.href}>{body}</Link> : <div key={t.label}>{body}</div>;
        })}
      </div>

      <hr className="stitch my-8 border-0" />

      <h2 className="mb-3 font-display text-lg font-bold">Handover checklist</h2>
      <Card>
        <ul className="list-disc space-y-2 pl-5 text-sm text-ink-mid">
          <li>The domain, server, and email accounts are registered to a UTBSA address, not a personal one.</li>
          <li>At least two people on the e-board have the admin role, so nobody gets locked out.</li>
          <li>A CSV export of the member list has been taken this term.</li>
          <li>A database backup ran recently, and someone has tested restoring it.</li>
        </ul>
      </Card>
    </>
  );
}
