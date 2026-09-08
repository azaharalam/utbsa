import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { heldOffices, permissionsFor } from '@/lib/permissions';
import { overview, moneySnapshot, nextEventSummary, recentActivity, healthWarnings } from '@/lib/queries/overview';
import { listPending } from '@/lib/queries/members';
import { activeElection, rollSize } from '@/lib/queries/elections';
import { getSettings } from '@/lib/queries/settings';
import { Card, Pill, Notice } from '@/components/ui';
import { Money } from '@/components/money/forms';
import QuickApprove from './quick-approve';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin' };

const VERB: Record<string, string> = {
  'member.approve': 'approved a member', 'member.reject': 'rejected a member',
  'member.status': 'changed a status', 'dues.assess': 'assessed dues',
  'dues.waiver': 'waived a balance', 'dues.write_off': 'wrote off a balance',
  'payment.record': 'recorded a payment', 'claim.confirm': 'confirmed a transfer',
  'claim.reject': 'rejected a transfer', 'donation.record': 'recorded a donation',
  'donation.acknowledge': 'thanked a donor', 'expense.record': 'recorded an expense',
  'post.save': 'saved a post', 'event.save': 'saved an event',
  'office.assign': 'assigned an office', 'office.handover': 'handed over an office',
  'election.create': 'created an election', 'election.voting': 'opened voting',
  'election.closed': 'closed voting', 'arrival.claim': 'took an airport pickup',
  'message.handled': 'answered a message', 'sponsor.publish': 'listed a sponsor',
};

function ago(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function until(iso: string) {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5);
  return days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
}

/**
 * The admin overview answers two questions: what is waiting on me, and is
 * anything quietly going wrong?
 *
 * Every block is permission-aware. A Treasurer is not told about members
 * waiting for approval, because they cannot act on it and it is noise.
 */
export default async function AdminHome() {
  const me = await requireAdmin();
  const [{ attention }, offices, perms, next, warnings, settings] = await Promise.all([
    overview(me), heldOffices(me.id), permissionsFor(me.id),
    nextEventSummary(), healthWarnings(me), getSettings(),
  ]);
  const has = (p: string) => perms.includes(p as any);

  const [money, pending, activity, election] = await Promise.all([
    has('money') ? moneySnapshot(me) : Promise.resolve(null),
    has('members') ? listPending(me) : Promise.resolve([]),
    has('roles') ? recentActivity() : Promise.resolve([]),
    activeElection(),
  ]);

  const roll = election?.status === 'voting' ? await rollSize(election.id) : null;
  const urgent = attention.filter((a) => a.urgent);
  const rest = attention.filter((a) => !a.urgent);

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {me.full_name.split(' ')[0]}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {offices.map((o) => <Pill key={o.id} tone="gold">{o.title}</Pill>)}
          <span className="text-sm text-ink-mid">{settings.current_session}</span>
        </div>
      </div>

      {/* ── things quietly going wrong ── */}
      {warnings.map((w, i) => (
        <div key={i} className="mb-3">
          <Notice tone="error">
            {w.text}
            {w.href && (
              <> <Link href={w.href} className="font-semibold underline">Sort it out</Link></>
            )}
          </Notice>
        </div>
      ))}

      {/* ── waiting on you ── */}
      {attention.length > 0 ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {[...urgent, ...rest].map((a) => (
            <Link key={a.key} href={a.href}>
              <Card className={`h-full p-4 transition-colors hover:border-kantha ${
                a.urgent ? 'border-genda bg-[#FDF8EC]' : ''}`}>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold leading-none text-nil">
                    {a.count}
                  </span>
                  <span className="font-display text-sm font-bold">{a.label}</span>
                </div>
                <p className="mt-1 text-xs text-ink-mid">{a.detail}</p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="mb-6">
          <p className="font-display text-base font-bold">Nothing waiting</p>
          <p className="text-sm text-ink-mid">
            No approvals, no transfers to check, nothing unanswered.
          </p>
        </Card>
      )}

      {/* ── approve without leaving ── */}
      {pending.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 font-display text-base font-bold">
            Approve from here
          </h2>
          <QuickApprove pending={pending} />
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* ── the next event ── */}
        {next && (
          <Card>
            <div className="mb-2 flex flex-wrap items-baseline gap-2">
              <h2 className="font-display text-lg font-bold">Next event</h2>
              <span className="text-sm text-kantha">{until(next.starts_at)}</span>
            </div>
            <Link href={`/admin/events/${next.id}`}
              className="font-display text-xl font-bold hover:text-kantha">
              {next.title}
            </Link>
            <p className="mb-3 text-sm text-ink-mid">
              {[next.location_name,
                new Date(next.starts_at).toLocaleDateString('en-US',
                  { weekday: 'long', day: 'numeric', month: 'long' })].filter(Boolean).join(' · ')}
            </p>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="font-display text-2xl font-bold text-nil">{next.people}</p>
                <p className="text-xs text-ink-mid">expected</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-nil">{next.households}</p>
                <p className="text-xs text-ink-mid">households</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-nil">{next.children}</p>
                <p className="text-xs text-ink-mid">children</p>
              </div>
            </div>

            {next.is_potluck && (
              <p className={`mt-3 text-sm ${next.dishes_open > 0 ? 'text-alta' : 'text-kantha'}`}>
                {next.dishes_open > 0
                  ? `${next.dishes_open} of ${next.dishes_total} dishes still unclaimed`
                  : 'Every dish is spoken for'}
              </p>
            )}
          </Card>
        )}

        {/* ── money, if they can see it ── */}
        {money && (
          <Card>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-bold">Money</h2>
              <Link href="/admin/finances" className="text-sm font-semibold text-kantha">
                Full picture →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-display text-2xl font-bold text-kantha">
                  <Money cents={money.collected - money.spent} />
                </p>
                <p className="text-xs text-ink-mid">in hand</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-nil">
                  <Money cents={money.outstanding} />
                </p>
                <p className="text-xs text-ink-mid">dues outstanding</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-ink-mid">
                <span>{money.paid_up} of {money.students} students settled</span>
                <span>{money.students > 0 ? Math.round((money.paid_up / money.students) * 100) : 0}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muslin-deep">
                <div className="h-full rounded-full bg-kantha"
                  style={{ width: `${money.students > 0 ? (money.paid_up / money.students) * 100 : 0}%` }} />
              </div>
            </div>
          </Card>
        )}

        {/* ── election, only while one is running ── */}
        {election && (
          <Card>
            <h2 className="mb-1 font-display text-lg font-bold">{election.name}</h2>
            <p className="mb-3 text-sm text-ink-mid">
              {election.status === 'voting' && roll
                ? `Voting is open — ${roll.voted} of ${roll.total} have voted`
                : `Currently: ${election.status.replace('_', ' ')}`}
            </p>
            {election.status === 'voting' && roll && (
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-muslin-deep">
                <div className="h-full rounded-full bg-genda"
                  style={{ width: `${roll.total > 0 ? (roll.voted / roll.total) * 100 : 0}%` }} />
              </div>
            )}
            <Link href={`/admin/elections/${election.id}`}
              className="text-sm font-semibold text-kantha">Open it →</Link>
          </Card>
        )}

        {/* ── who did what ── */}
        {activity.length > 0 && (
          <Card>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-bold">Lately</h2>
              <Link href="/admin/activity" className="text-sm font-semibold text-kantha">
                All activity →
              </Link>
            </div>
            <ul className="space-y-2">
              {activity.map((a, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stitch" />
                  <span className="min-w-0">
                    <span className="font-semibold">{a.actor_name ?? 'Someone'}</span>
                    {a.actor_role && (
                      <span className="text-xs text-kantha"> ({a.actor_role})</span>
                    )}
                    <span className="text-ink-mid"> {VERB[a.action] ?? a.action}</span>
                    <span className="block text-xs text-ink-mid">{ago(a.created_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <hr className="stitch my-8 border-0" />

      <h2 className="mb-3 font-display text-lg font-bold">Before you hand over</h2>
      <Card>
        <ul className="list-disc space-y-2 pl-5 text-sm text-ink-mid">
          <li>The domain, server, and email accounts are registered to a UTBSA address, not a personal one.</li>
          <li>At least two people hold an office with full access.</li>
          <li>A CSV export of the member list has been taken this term.</li>
          <li>A database backup ran recently, and someone has restored it once to check it works.</li>
        </ul>
      </Card>
    </>
  );
}
