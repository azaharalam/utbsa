import { requireAdmin, getCurrentMember } from '@/lib/session';
import { currentOffices, pastOffices, handoverPlan } from '@/lib/queries/offices';
import { listAll } from '@/lib/queries/members';
import { listElections } from '@/lib/queries/elections';
import { getSettings } from '@/lib/queries/settings';
import { can } from '@/lib/permissions';
import { Card, Pill, Avatar, Notice } from '@/components/ui';
import { PERMISSION_SETS } from '@/lib/permissions';
import OfficeAdmin from './manage';
import ResignBox from './resign';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Offices' };

export default async function Offices() {
  const me = await requireAdmin();
  const manageRoles = await can(me.id, 'roles');

  const [current, past, members, elections, settings] = await Promise.all([
    currentOffices(),
    pastOffices(),
    manageRoles ? listAll(me, { status: 'active' }) : Promise.resolve([]),
    listElections(),
    getSettings(),
  ]);

  const closed = elections.find((e) => e.status === 'closed');
  const plan = closed ? await handoverPlan(closed.id) : [];
  const mine = current.filter((o) => o.member_id === me.id);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Offices</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-mid">
        The board for <strong>{settings.current_session}</strong>. Access follows the
        office, not the account — nobody is ever sent a password. When someone takes
        office the extra sections appear the next time they sign in with the email
        they already use, and when they resign the access stops.
      </p>

      {mine.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 font-display text-lg font-bold">Your office</h2>
          {mine.map((o) => (
            <ResignBox key={o.id} office={o}
              plan={plan.find((p: any) => p.title === o.title) ?? null}
              electionId={closed?.id ?? null}
              members={members.map((m) => ({ id: m.id, name: m.full_name }))} />
          ))}
        </div>
      )}

      <h2 className="mb-2 font-display text-lg font-bold">Who holds what</h2>
      <div className="mb-6 space-y-2">
        {current.map((o) => (
          <Card key={o.id} className="p-3">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar name={o.member_name} url={o.photo_url} size={34} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold">{o.member_name}</p>
                <p className="text-xs text-kantha">{o.title}</p>
                <p className="text-xs text-ink-mid">
                  {o.session} · since {new Date(o.started_at).toLocaleDateString('en-US',
                    { month: 'short', year: 'numeric' })}
                </p>
              </div>
              <Pill tone={o.permission_set === 'full' ? 'gold' : 'grey'}>
                {PERMISSION_SETS[o.permission_set]?.label}
              </Pill>
            </div>
          </Card>
        ))}
        {!current.length && <Notice tone="error">Nobody holds any office.</Notice>}
      </div>

      {manageRoles && (
        <OfficeAdmin
          offices={current.map((o) => ({ id: o.id, title: o.title, holder: o.member_name }))}
          members={members.map((m) => ({ id: m.id, name: m.full_name }))}
          session={settings.current_session}
        />
      )}

      {past.length > 0 && (
        <>
          <h2 className="mb-2 mt-8 font-display text-lg font-bold">Previously</h2>
          <div className="space-y-1.5 text-sm text-ink-mid">
            {past.map((o) => (
              <p key={o.id}>
                {o.member_name} — {o.title}
                {o.ended_at && `, until ${new Date(o.ended_at).toLocaleDateString('en-US',
                  { month: 'short', year: 'numeric' })}`}
              </p>
            ))}
          </div>
        </>
      )}
    </>
  );
}
