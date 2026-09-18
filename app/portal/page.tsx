import Link from 'next/link';
import { requireApproved } from '@/lib/session';
import { upcomingEvents } from '@/lib/queries/content';
import { myRsvp, eventHeadcount } from '@/lib/queries/tickets';
import { itemsFor, claimsByHousehold } from '@/lib/queries/potluck';
import { memberBalance } from '@/lib/queries/dues';
import { arrivalBoard } from '@/lib/queries/community';
import { activeElection, canVote } from '@/lib/queries/elections';
import { householdOf } from '@/lib/queries/households';
import { heldOffices } from '@/lib/permissions';
import { pulse, communityStats } from '@/lib/queries/pulse';
import { Card, Pill, Avatar } from '@/components/ui';
import QuickRsvp from '@/components/money/quick-rsvp';
import QuickPotluck from '@/components/money/quick-potluck';
import QuickArrival from '@/components/money/quick-arrival';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Portal' };

const PULSE_VERB: Record<string, string> = {
  joined: 'joined UTBSA',
  giveaway: 'is going spare',
  post: 'new on the blog',
  housing: 'room posted',
  job: 'job posted',
};

function ago(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'long' });
}

function until(iso: string) {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 14) return `in ${days} days`;
  return `in ${Math.ceil(days / 7)} weeks`;
}

/**
 * The dashboard exists so a member can DO something, not read about the
 * organisation. Every panel below is either an action they can take here,
 * without navigating, or a sign that other people are around.
 */
export default async function Portal() {
  const me = await requireApproved();

  const [events, balance, household, arrivals, election, offices, feed, stats] =
    await Promise.all([
      upcomingEvents(me, 3),
      memberBalance(me.id),
      householdOf(me.id),
      arrivalBoard(me),
      activeElection(),
      heldOffices(me.id),
      pulse(me),
      communityStats(),
    ]);

  const next = events[0] ?? null;
  const [nextRsvp, nextHead, potluckItems, myDishes] = next
    ? await Promise.all([
        myRsvp(me.id, next.id),
        eventHeadcount(next.id),
        next.is_potluck ? itemsFor(next.id) : Promise.resolve([]),
        next.is_potluck ? claimsByHousehold(me.id, next.id) : Promise.resolve([]),
      ])
    : [null, null, [], []];

  const voteOpen = election?.status === 'voting'
    ? await canVote(me.id, election.id) : null;

  const isStudent = me.member_type === 'student';
  const firstName = me.full_name.split(' ')[0];
  const others = household.filter((h) => h.id !== me.id);
  const openArrivals = arrivals.filter((a) => a.status === 'open');

  const statusTone =
    me.status === 'active' ? 'green' : me.status === 'alumni' ? 'gold' : 'grey';

  return (
    <>
      {/* ── who you are ── */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={me.full_name} url={me.photo_url} size={56} />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Hello, {firstName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Pill tone={statusTone}>{me.status}</Pill>
            {offices.map((o) => <Pill key={o.id} tone="gold">{o.title}</Pill>)}
            {others.length > 0 && (
              <span className="text-sm text-ink-mid">
                with {others.map((h) => h.full_name.split(' ')[0]).join(' and ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── the next event, answerable right here ── */}
      {next ? (
        <Card className="mb-5">
          <div className="mb-3 flex flex-wrap items-baseline gap-2">
            <p className="font-display text-sm font-semibold text-kantha">
              {until(next.starts_at)}
            </p>
            {next.is_potluck && <Pill tone="green">potluck</Pill>}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="w-16 shrink-0 text-center">
              <p className="font-display text-xs font-bold uppercase text-alta">
                {new Date(next.starts_at).toLocaleDateString('en-US', { month: 'short' })}
              </p>
              <p className="font-display text-4xl font-extrabold leading-none text-nil">
                {new Date(next.starts_at).getDate()}
              </p>
              <p className="text-xs text-ink-mid">
                {new Date(next.starts_at).toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <Link href={`/events/${next.slug}`}
                className="font-display text-xl font-bold hover:text-kantha">
                {next.title}
              </Link>
              <p className="text-sm text-ink-mid">
                {[next.location_name,
                  new Date(next.starts_at).toLocaleTimeString('en-US',
                    { hour: 'numeric', minute: '2-digit' })].filter(Boolean).join(' · ')}
              </p>
              {nextHead && nextHead.people > 0 && (
                <p className="mt-1 text-sm text-ink-mid">
                  {nextHead.people} coming so far
                </p>
              )}

              <div className="mt-3">
                <QuickRsvp
                  eventId={next.id}
                  householdSize={Math.max(1, household.length)}
                  answered={!!nextRsvp}
                  answeredBy={nextRsvp && nextRsvp.member_id !== me.id ? nextRsvp.member_name : null}
                  adults={nextRsvp?.adults ?? 0}
                  children={nextRsvp?.children ?? 0}
                />
              </div>

              {next.is_potluck && potluckItems.length > 0 && (
                <div className="mt-4 border-t-2 border-dashed border-stitch pt-3">
                  <QuickPotluck items={potluckItems} mine={myDishes} eventSlug={next.slug} />
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="mb-5">
          <p className="font-display text-base font-bold">Nothing scheduled yet</p>
          <p className="text-sm text-ink-mid">
            You will get an email when the e-board plans something.
          </p>
        </Card>
      )}

      {/* ── things only you can clear ── */}
      {(isStudent && balance > 0) || (voteOpen?.ok && !voteOpen.voted) ? (
        <Card className="mb-5 border-genda bg-[#FDF8EC]">
          <div className="space-y-2">
            {voteOpen?.ok && !voteOpen.voted && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1 text-sm">
                  Voting is open in the {election!.name}.
                </span>
                <Link href="/portal/election"
                  className="min-h-[36px] rounded-lg bg-kantha px-3 py-2 text-xs font-semibold text-white">
                  Vote
                </Link>
              </div>
            )}
            {isStudent && balance > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1 text-sm">
                  We ask $15 a semester — not yet received. No rush — it
                  carries over.
                </span>
                <Link href="/portal/dues"
                  className="min-h-[36px] rounded-lg border-[1.5px] border-nil px-3 py-2 text-xs font-semibold text-nil">
                  How to pay
                </Link>
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {/* ── somebody needs a lift ── */}
      {openArrivals.length > 0 && (
        <Card className="mb-5">
          <h2 className="mb-1 font-display text-base font-bold">
            Landing soon, nobody assigned
          </h2>
          <p className="mb-3 text-sm text-ink-mid">
            Someone arriving at an airport four thousand miles from home. It takes
            an afternoon.
          </p>
          <QuickArrival arrivals={openArrivals} />
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        {/* ── what people are doing ── */}
        <Card>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-bold">Lately</h2>
            <p className="text-xs text-ink-mid">
              {stats.members} members
              {stats.newThisTerm > 0 && ` · ${stats.newThisTerm} new this term`}
            </p>
          </div>

          {feed.length ? (
            <ul className="space-y-3">
              {feed.map((f, i) => (
                <li key={i}>
                  <Link href={f.href} className="group flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-kantha" />
                    <span className="min-w-0">
                      <span className="block text-sm">
                        <span className="font-semibold group-hover:text-kantha">{f.title}</span>
                        <span className="text-ink-mid"> — {PULSE_VERB[f.kind]}</span>
                      </span>
                      {f.detail && (
                        <span className="block truncate text-xs text-ink-mid">{f.detail}</span>
                      )}
                      <span className="block text-xs text-ink-mid">{ago(f.at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-mid">
              Quiet at the moment. Post something on the giveaway board and start it off.
            </p>
          )}
        </Card>

        {/* ── everything else ── */}
        <div className="space-y-3">
          {[
            { href: '/portal/events', title: 'Events',
              body: events.length > 1 ? `${events.length} coming up` : 'What is planned' },
            { href: '/portal/directory', title: 'Directory',
              body: 'Find someone by department or district' },
            { href: '/portal/giveaway', title: 'Giveaway',
              body: 'Furniture and kitchen things going spare' },
            { href: '/portal/housing', title: 'Rooms',
              body: 'Rooms, sublets, and people looking' },
            { href: '/portal/jobs', title: 'Jobs',
              body: 'Openings and referrals from alumni' },
            { href: '/portal/dues', title: 'My contribution',
              body: !isStudent ? 'Nothing asked of you'
                   : balance > 0 ? 'Not yet sent' : 'Thank you' },
          ].map((c) => (
            <Link key={c.href} href={c.href}>
              <Card className="p-3 transition-colors hover:border-kantha">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-bold">{c.title}</p>
                    <p className="truncate text-xs text-ink-mid">{c.body}</p>
                  </div>
                  <span className="text-ink-mid">→</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
