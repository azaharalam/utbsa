import Link from 'next/link';
import { requirePermission } from '@/lib/session';
import { officers } from '@/lib/queries/content';
import { getSettings } from '@/lib/queries/settings';
import { Card, Avatar, Empty, Button } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'E-board' };

/**
 * A read-only view of what the public sees. Assigning and ending offices
 * happens on /admin/offices, so there is one place where access changes hands.
 */
export default async function EBoardAdmin() {
  await requirePermission('roles');
  const [settings, board] = await Promise.all([getSettings(), officers()]);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">E-board</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-mid">
        The board for {settings.current_session}, exactly as it appears on the
        public page. To change who holds an office, go to{' '}
        <Link href="/admin/offices" className="font-semibold text-kantha">Offices</Link>.
      </p>

      {board.length ? (
        <div className="space-y-3">
          {board.map((o) => (
            <Card key={o.id} className="flex items-center gap-3 p-4">
              <Avatar name={o.full_name} url={o.photo_url} size={40} />
              <div className="min-w-0">
                <p className="font-display text-[15px] font-bold">{o.full_name}</p>
                <p className="text-sm text-kantha">{o.title}</p>
                {o.department && <p className="text-xs text-ink-mid">{o.department}</p>}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Empty
          title="Nobody on the board yet"
          body={`No offices are held for ${settings.current_session}. Assign them from the Offices page.`}
          action={<Button href="/admin/offices">Go to Offices</Button>}
        />
      )}
    </>
  );
}
