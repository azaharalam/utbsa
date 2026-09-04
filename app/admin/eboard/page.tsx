import { requireAdmin } from '@/lib/session';
import { officers, currentTerm } from '@/lib/queries/content';
import { listAll } from '@/lib/queries/members';
import { Card, Avatar, Empty } from '@/components/ui';
import OfficerForm from './form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'E-board' };

export default async function EBoardAdmin() {
  const me = await requireAdmin();
  const [term, board, members] = await Promise.all([
    currentTerm(), officers(), listAll(me, { status: 'active' }),
  ]);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">E-board</h1>
      <p className="mb-6 text-sm text-ink-mid">Current term: {term?.name ?? 'none set'}</p>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <OfficerForm members={members.map((m) => ({ id: m.id, name: m.full_name }))} />

        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold">This year&apos;s board</h2>
          {board.length ? (
            board.map((o) => (
              <Card key={o.id} className="flex items-center gap-3 p-4">
                <Avatar name={o.full_name} url={o.photo_url} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-display text-[15px] font-bold">{o.full_name}</p>
                  <p className="text-sm text-kantha">{o.title}</p>
                </div>
              </Card>
            ))
          ) : (
            <Empty title="No officers yet" body="Add them with the form. They appear on the public e-board page immediately." />
          )}
        </div>
      </div>
    </>
  );
}
