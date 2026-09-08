import { requirePermission } from '@/lib/session';
import { allArrivals, volunteerCandidates } from '@/lib/queries/community';
import Assign from './assign';
import { Card, Pill, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Arrivals' };

export default async function AdminArrivals({ searchParams }: { searchParams: { all?: string } }) {
  const me = await requirePermission('members');
  const showClosed = searchParams.all === '1';
  const [list, candidates] = await Promise.all([
    allArrivals(me, showClosed),
    volunteerCandidates(me),
  ]);

  const unclaimed = list.filter((a) => a.status === 'open');
  const soon = unclaimed.filter(
    (a) => new Date(a.arriving_on).getTime() - Date.now() < 7 * 864e5
  );

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Arrivals</h1>
      <p className="mb-4 max-w-2xl text-sm text-ink-mid">
        Everyone who asked for help landing in Toledo, with full details. Members see
        only a first name and a date until they volunteer — this page is the exception,
        so treat it accordingly.
      </p>
      <p className="mb-4 max-w-2xl text-sm text-ink-mid">
        You can put somebody&apos;s name against a request yourself. They get an email
        with the flight details and can release it if they cannot make it — worth
        asking them first, since it hands them a stranger&apos;s phone number.
      </p>

      {soon.length > 0 && (
        <div className="mb-5 rounded-xl border-2 border-dashed border-alta bg-[#F7DEDB] p-4">
          <p className="font-display text-base font-bold">
            {soon.length} arriving within a week with nobody assigned
          </p>
          <p className="text-sm text-ink-mid">
            Post it in the WhatsApp group. Somebody landing at Detroit with two
            suitcases and no lift is the thing this whole feature exists to prevent.
          </p>
        </div>
      )}

      <div className="mb-5 flex gap-2">
        <a href="/admin/arrivals"><Pill tone={showClosed ? 'grey' : 'green'}>Coming up</Pill></a>
        <a href="/admin/arrivals?all=1"><Pill tone={showClosed ? 'green' : 'grey'}>Everything</Pill></a>
      </div>

      {list.length ? (
        <div className="space-y-3">
          {list.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold">
                    {a.full_name}
                    {a.people_count > 1 && (
                      <span className="ml-2 font-normal text-ink-mid">
                        +{a.people_count - 1}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-ink-mid">
                    {new Date(a.arriving_on).toLocaleDateString('en-US',
                      { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    {a.arriving_at && ` at ${a.arriving_at.slice(0, 5)}`}
                    {' · '}{a.airport}
                    {a.flight_no && ` · ${a.flight_no}`}
                  </p>
                  <p className="text-xs text-ink-mid">
                    <a href={`mailto:${a.email}`} className="text-kantha">{a.email}</a>
                    {a.phone && ` · ${a.phone}`}
                  </p>
                  {(a.program || a.department) && (
                    <p className="text-xs text-ink-mid">
                      {[a.program, a.department].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {a.note && <p className="mt-1 text-sm text-ink-mid">{a.note}</p>}

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.needs_pickup && <Pill tone="green">pickup</Pill>}
                    {a.needs_stay && <Pill tone="green">place to stay</Pill>}
                    {a.needs_shopping && <Pill tone="green">first shop</Pill>}
                  </div>
                </div>
              </div>

              <Assign arrival={a} candidates={candidates} />
            </Card>
          ))}
        </div>
      ) : (
        <Empty title="Nobody has asked yet"
          body="The form is at /arrive — worth linking from the Facebook group before each intake." />
      )}
    </>
  );
}
