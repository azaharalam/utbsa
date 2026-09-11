import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentMember } from '@/lib/session';
import { eventBySlug } from '@/lib/queries/content';
import { Card, Pill } from '@/components/ui';
import RsvpBox from '@/components/money/rsvp';
import PotluckBoard from '@/components/money/potluck-board';
import AddToCalendar from '@/components/money/add-to-calendar';
import { myRsvp, eventHeadcount, eventRsvps } from '@/lib/queries/tickets';
import {
  teamsFor, playersFor, registrationOpen, myRegistration, contributionFor,
} from '@/lib/queries/tournament';
import TournamentPanel from '@/components/money/tournament-panel';
import { itemsFor } from '@/lib/queries/potluck';
import { householdOf } from '@/lib/queries/households';

export const dynamic = 'force-dynamic';

export default async function EventPage({ params }: { params: { slug: string } }) {
  const me = await getCurrentMember();
  const e = await eventBySlug(me, params.slug);
  if (!e) notFound();

  const start = new Date(e.starts_at);
  const isPast = start < new Date();

  const canRsvp = !!me && ['active', 'inactive', 'alumni'].includes(me.status);

  const [existing, headcount, household, potluck, attending,
         teams, players, myPlay, contribution] = await Promise.all([
    canRsvp ? myRsvp(me!.id, e.id) : Promise.resolve(null),
    eventHeadcount(e.id),
    canRsvp ? householdOf(me!.id) : Promise.resolve([]),
    e.is_potluck ? itemsFor(e.id) : Promise.resolve([]),
    canRsvp ? eventRsvps(e.id) : Promise.resolve([]),
    e.is_tournament ? teamsFor(e.id) : Promise.resolve([]),
    e.is_tournament ? playersFor(e.id) : Promise.resolve([]),
    e.is_tournament && me ? myRegistration(me.id, e.id) : Promise.resolve(null),
    e.is_tournament ? contributionFor(e.id) : Promise.resolve({
      player_contribution_cents: 0, cost_breakdown: null,
    }),
  ]);

  const regState = e.is_tournament ? registrationOpen(e) : { open: false };
  const teamNamed = (id: string | null) =>
    id ? (teams.find((t) => t.id === id)?.name ?? null) : null;

  // Somebody else in the household may already have answered for both.
  const answeredBy = existing && existing.member_id !== me?.id
    ? existing.member_name : null;

  const calendar = {
    title: e.title,
    description: e.description,
    location: [e.location_name, e.location_addr].filter(Boolean).join(', '),
    startsAt: e.starts_at,
    endsAt: e.ends_at,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Back to where they came from: the portal list if signed in. */}
      <Link href={me ? '/portal/events' : '/events'}
        className="mb-6 inline-block text-sm text-kantha">← All events</Link>

      {isPast && <div className="mb-4"><Pill tone="grey">This event has passed</Pill></div>}
      {!isPast && !canRsvp && (
        <div className="mb-4">
          <AddToCalendar event={{
            title: e.title, description: e.description,
            location: [e.location_name, e.location_addr].filter(Boolean).join(', '),
            startsAt: e.starts_at, endsAt: e.ends_at,
          }} slug={e.slug} />
        </div>
      )}

      <h1 className="mb-2 font-display text-3xl font-bold sm:text-4xl">{e.title}</h1>
      {e.bengali_title && <p className="mb-4 font-display text-xl text-ink-mid">{e.bengali_title}</p>}

      <Card className="mb-6">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-ink-mid">When</dt>
            <dd className="text-[15px]">
              {start.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              <br />
              {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              {e.ends_at && ` – ${new Date(e.ends_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ink-mid">Where</dt>
            <dd className="text-[15px]">
              {e.location_name ?? 'To be confirmed'}
              {e.location_addr && <><br /><span className="text-ink-mid">{e.location_addr}</span></>}
            </dd>
          </div>
        </dl>
      </Card>

      {e.description && <p className="whitespace-pre-line text-[15px] leading-relaxed">{e.description}</p>}

      {!isPast && canRsvp && (
        <RsvpBox eventId={e.id} existing={existing} headcount={headcount}
          household={household.map((h) => ({ id: h.id, full_name: h.full_name }))}
          answeredBy={answeredBy} calendar={calendar} slug={e.slug} />
      )}

      {e.is_tournament && (
        <div className="mb-6">
          <TournamentPanel
            eventId={e.id}
            open={regState.open}
            closedWhy={regState.why}
            mine={myPlay}
            teams={teams}
            players={players}
            published={Boolean(e.teams_published_at)}
            champion={teamNamed(e.champion_team_id)}
            runnerUp={teamNamed(e.runner_up_team_id)}
            /* Shown to the signed-in player only — never on the public page. */
            contributionCents={me ? contribution.player_contribution_cents : 0}
            costBreakdown={me ? contribution.cost_breakdown : null}
            isStudent={me?.member_type === 'student'}
            signedIn={Boolean(me)}
          />
        </div>
      )}

      {e.is_potluck && potluck.length > 0 && (
        <PotluckBoard items={potluck} meId={me?.id ?? null}
          myHouseholdId={household[0] ? (me as any)?.household_id ?? null : null}
          canClaim={canRsvp && !isPast} />
      )}

      {/* Only those who said yes. Never the whole membership. */}
      {!isPast && canRsvp && attending.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-1 font-display text-lg font-bold">Who is coming</h2>
          <p className="mb-3 text-sm text-ink-mid">
            {headcount.people} {headcount.people === 1 ? 'person' : 'people'} from{' '}
            {headcount.households} {headcount.households === 1 ? 'household' : 'households'}
            {headcount.children > 0 && `, including ${headcount.children} children`}.
          </p>
          <ul className="space-y-1.5 text-sm">
            {attending.map((r) => {
              const extra = r.adults - 1 + r.children;
              return (
                <li key={r.id}>
                  {r.household_names ?? r.member_name}
                  {extra > 0 && (
                    <span className="text-ink-mid">
                      {' '}+{extra}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {!isPast && !canRsvp && (
        <div className="mt-8 rounded-xl border-2 border-dashed border-stitch bg-white/60 p-5">
          <p className="mb-1 font-display font-bold">Sign in to RSVP</p>
          <p className="mb-3 text-sm text-ink-mid">
            Members tell us they are coming, and how many they are bringing, so we
            order the right amount of food.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/login" className="text-sm font-semibold text-kantha">Sign in</Link>
            <Link href="/join" className="text-sm font-semibold text-kantha">Join UTBSA</Link>
          </div>
        </div>
      )}
    </div>
  );
}
