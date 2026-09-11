import { officers } from '@/lib/queries/content';
import { getSettings } from '@/lib/queries/settings';
import { Card, Avatar, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'E-board' };

export default async function EBoard() {
  const [settings, board] = await Promise.all([getSettings(), officers()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="mb-1.5 font-display text-sm font-semibold text-kantha">{settings.current_session}</p>
      <h1 className="mb-2 font-display text-3xl font-bold sm:text-4xl">Who&apos;s running things this year</h1>
      <p className="mb-8 max-w-2xl text-ink-mid">
        Elected each spring by members in good standing. Email us at info@utoledobsa.org — it reaches everyone listed below.
      </p>

      {board.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {board.map((o) => (
            <Card key={o.id} className="flex items-center gap-4">
              <Avatar name={o.full_name} url={o.photo_url} />
              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold">{o.full_name}</p>
                <p className="text-sm font-semibold text-kantha">{o.title}</p>
                <p className="truncate text-xs text-ink-mid">
                  {o.department}
                </p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Empty
          title="No e-board listed yet"
          body="An admin can add this year's officers from the admin area. They will appear here automatically."
        />
      )}
    </div>
  );
}
