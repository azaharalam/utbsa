import { requireApproved } from '@/lib/session';
import { householdOf, pendingInvites } from '@/lib/queries/households';
import { sql } from '@/lib/db';
import ProfileForm from './form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My profile' };

export default async function ProfilePage() {
  const me = await requireApproved();

  const [household, invites, candidates] = await Promise.all([
    householdOf(me.id),
    pendingInvites(me.id),
    sql<{ id: string; full_name: string }[]>`
      select id, full_name from members
      where status in ('active','inactive','alumni')
        and household_id is null and id <> ${me.id}
      order by full_name`,
  ]);

  return (
    <ProfileForm member={me} household={household}
      incoming={invites.incoming} outgoing={invites.outgoing}
      members={candidates.map((c) => ({ id: c.id, name: c.full_name }))} />
  );
}
