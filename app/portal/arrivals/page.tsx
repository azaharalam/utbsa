import { requireApproved } from '@/lib/session';
import { arrivalBoard, arrivalDetail } from '@/lib/queries/community';
import { Card, Empty } from '@/components/ui';
import ArrivalCard from './card';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Arrivals' };

export default async function Arrivals() {
  const me = await requireApproved();
  const board = await arrivalBoard(me);

  // Full details only for the ones this member has taken on.
  const details = await Promise.all(
    board.filter((b) => b.mine).map((b) => arrivalDetail(me, b.id))
  );
  const mineById = new Map(details.filter(Boolean).map((d) => [d!.id, d!]));

  const mine = board.filter((b) => b.mine);
  const open = board.filter((b) => b.status === 'open');
  const taken = board.filter((b) => b.status === 'claimed' && !b.mine);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Arrivals</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-mid">
        People landing in Toledo who asked for help. Take one and their flight
        details appear on the card — until then you only see a first name and a
        date, because their phone number is not something to leave lying around.
      </p>

      {mine.length > 0 && (
        <>
          <h2 className="mb-2 font-display text-lg font-bold">You are meeting</h2>
          <div className="mb-6 space-y-3">
            {mine.map((a) => (
              <ArrivalCard key={a.id} summary={a} detail={mineById.get(a.id) ?? null} />
            ))}
          </div>
        </>
      )}

      <h2 className="mb-2 font-display text-lg font-bold">Needs someone</h2>
      {open.length ? (
        <div className="mb-6 space-y-3">
          {open.map((a) => <ArrivalCard key={a.id} summary={a} detail={null} />)}
        </div>
      ) : (
        <Empty title="Nobody waiting"
          body="When someone fills in the arrival form, they show up here." />
      )}

      {taken.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 font-display text-lg font-bold">Already covered</h2>
          <div className="space-y-2">
            {taken.map((a) => (
              <Card key={a.id} className="p-3 opacity-70">
                <p className="text-sm">
                  {a.first_name} — {new Date(a.arriving_on).toLocaleDateString('en-US',
                    { weekday: 'short', day: 'numeric', month: 'short' })}
                  <span className="ml-2 text-xs text-ink-mid">
                    {a.claimed_by_name} is on it
                  </span>
                </p>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
