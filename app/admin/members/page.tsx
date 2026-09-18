import { requirePermission } from '@/lib/session';
import { listAll, statusCounts } from '@/lib/queries/members';
import { Pill } from '@/components/ui';
import { currentOffices } from '@/lib/queries/offices';
import ExportButton from './export';
import MemberList from './list';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Members' };

export default async function Members({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const me = await requirePermission('members');
  const status = searchParams.status ?? '';

  // Every member for this status, unfiltered. Searching happens in the
  // browser, so there is no request per keystroke and no waiting.
  const [members, counts, offices] = await Promise.all([
    listAll(me, { status: status || undefined }),
    statusCounts(me),
    currentOffices(),
  ]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Members</h1>
        <ExportButton members={members} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <a href="/admin/members"><Pill tone={status ? 'grey' : 'green'}>All {total}</Pill></a>
        {['active', 'pending', 'inactive', 'alumni', 'rejected'].map((s) => (
          <a key={s} href={`/admin/members?status=${s}`}>
            <Pill tone={status === s ? 'green' : 'grey'}>
              {s[0].toUpperCase() + s.slice(1)} {counts[s] ?? 0}
            </Pill>
          </a>
        ))}
      </div>

      <MemberList
        members={members}
        offices={offices.map((o) => [o.member_id, o.title] as [string, string])}
        meId={me.id}
      />
    </>
  );
}
