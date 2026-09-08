import { requirePermission } from '@/lib/session';
import { activity, activitySummary } from '@/lib/queries/inbox';
import { Card, Pill, Empty } from '@/components/ui';
import Entry from './entry';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Activity' };

const VERB: Record<string, string> = {
  'member.approve': 'approved a member',
  'member.reject': 'rejected a member',
  'member.status': 'changed a member\u2019s status',
  'dues.assess': 'assessed dues for a term',
  'dues.set_rate': 'changed the dues rate',
  'dues.waiver': 'waived a balance',
  'dues.write_off': 'wrote off a balance',
  'dues.credit': 'credited an account',
  'dues.correction': 'corrected a balance',
  'payment.record': 'recorded a payment',
  'claim.confirm': 'confirmed a transfer',
  'claim.reject': 'rejected a transfer',
  'donation.record': 'recorded a donation',
  'donation.acknowledge': 'thanked a donor',
  'donation.reassign': 'moved a gift between funds',
  'fund.create': 'created a fund',
  'expense.record': 'recorded an expense',
  'post.save': 'saved a post',
  'event.save': 'saved an event',
  'event.cancel_refund': 'cancelled an event and refunded',
  'event.check_in': 'checked someone in',
  'ticket.sell': 'sold tickets',
  'office.assign': 'gave someone an office',
  'office.end': 'ended an office',
  'office.handover': 'handed over an office',
  'election.create': 'created an election',
  'election.announced': 'announced an election',
  'election.nominations': 'opened nominations',
  'election.poll_ready': 'closed nominations',
  'election.voting': 'opened voting',
  'election.closed': 'closed voting',
  'nomination.approved': 'approved a nomination',
  'nomination.declined': 'declined a nomination',
  'status_request.approved': 'approved a status change',
  'status_request.declined': 'declined a status change',
  'settings.update': 'changed settings',
  'message.handled': 'dealt with a message',
  'export': 'exported data',
};

const SENSITIVE = /waiv|write_off|office|election|settings|export|reject/;

export default async function Activity({ searchParams }: { searchParams: { action?: string } }) {
  const me = await requirePermission('roles');
  const [rows, summary] = await Promise.all([
    activity(me, { action: searchParams.action }),
    activitySummary(me),
  ]);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Activity</h1>
      <p className="mb-5 max-w-2xl text-sm text-ink-mid">
        Every create, update, and delete an officer has made — with who, the office
        they held at the time, and <strong>what the value was before</strong>. The
        office is recorded as it was, so an entry still reads &ldquo;President&rdquo;
        years after that person handed over.
      </p>
      <p className="mb-5 max-w-2xl text-sm text-ink-mid">
        Members editing their own profiles is not recorded, and neither is signing in.
        This logs the use of power, not participation. Voting is absent by design: a
        trail linking someone to a ballot would defeat the secrecy the election rests on.
      </p>

      <h2 className="mb-2 font-display text-base font-bold">Last 90 days</h2>
      <div className="mb-6 flex flex-wrap gap-2">
        {summary.map((s) => (
          <a key={s.action} href={`/admin/activity?action=${s.action}`}>
            <Pill tone={searchParams.action === s.action ? 'green' : 'grey'}>
              {VERB[s.action] ?? s.action} · {s.count}
            </Pill>
          </a>
        ))}
        {searchParams.action && (
          <a href="/admin/activity"><Pill tone="gold">clear filter</Pill></a>
        )}
      </div>

      {rows.length ? (
        <Card>
          <ul>
            {rows.map((r) => (
              <Entry key={r.id} entry={r} verb={VERB[r.action] ?? r.action.replace(/[._]/g, ' ')} />
            ))}
          </ul>
        </Card>
      ) : (
        <Empty title="Nothing recorded yet" body="Officer actions appear here as they happen." />
      )}

      <p className="mt-4 text-xs text-ink-mid">
        Entries older than three years are removed automatically. A log kept forever
        becomes a liability nobody thinks about until it matters.
      </p>
    </>
  );
}
