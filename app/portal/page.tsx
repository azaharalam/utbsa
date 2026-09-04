import Link from 'next/link';
import { requireApproved } from '@/lib/session';
import { upcomingEvents } from '@/lib/queries/content';
import { directory } from '@/lib/queries/members';
import { Card, Button, Pill } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Portal' };

const OPTIONAL = [
  'photo_url', 'student_level', 'department',
  'hometown_bd', 'arrival_semester', 'bio', 'phone',
] as const;

export default async function Portal() {
  const me = await requireApproved();
  const [events, dir] = await Promise.all([upcomingEvents(me, 3), directory(me)]);

  const filled = OPTIONAL.filter((f) => !!me[f]).length;
  const pct = Math.round((filled / OPTIONAL.length) * 100);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">
        Hello, Dear {me.full_name.split(' ')[0]}
      </h1>
      <p className="mb-6 text-sm text-ink-mid">
        Member since {new Date(me.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>

      {pct < 100 && (
        <Card className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-bold">Your profile is {pct}% complete</h2>
              <p className="text-sm text-ink-mid">Add your department and hometown so people can find you.</p>
            </div>
            <Button href="/portal/profile">Finish profile</Button>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muslin-deep">
            <div className="h-full rounded-full bg-genda" style={{ width: `${pct}%` }} />
          </div>
        </Card>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="font-display text-3xl font-bold leading-tight text-nil">{dir.length}</p>
          <p className="text-xs text-ink-mid">Members listed</p>
        </Card>
        <Card className="p-4">
          <p className="font-display text-3xl font-bold leading-tight text-nil">{events.length}</p>
          <p className="text-xs text-ink-mid">Events coming up</p>
        </Card>
        <Card className="col-span-2 p-4 sm:col-span-1">
          <p className="font-display text-3xl font-bold capitalize leading-tight text-nil">{me.status}</p>
          <p className="text-xs text-ink-mid">Your membership</p>
        </Card>
      </div>

      <h2 className="mb-3 font-display text-lg font-bold">Coming up</h2>
      {events.length ? (
        <div className="space-y-3">
          {events.map((e) => (
            <Card key={e.id}>
              <div className="flex flex-wrap items-center gap-4">
                <div className="w-12 shrink-0 text-center">
                  <p className="font-display text-xs font-bold uppercase text-alta">
                    {new Date(e.starts_at).toLocaleDateString('en-US', { month: 'short' })}
                  </p>
                  <p className="font-display text-2xl font-extrabold leading-none text-nil">
                    {new Date(e.starts_at).getDate()}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/events/${e.slug}`} className="font-display text-base font-bold hover:text-kantha">
                    {e.title}
                  </Link>
                  <p className="text-sm text-ink-mid">{e.location_name}</p>
                </div>
                <Pill tone="grey">RSVP coming soon</Pill>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-mid">Nothing scheduled right now.</p>
      )}
    </>
  );
}
