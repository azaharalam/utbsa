import 'server-only';
import { sql } from '@/lib/db';
import { audit, tracked, trackedCreate } from '@/lib/audit';
import { can, PERMISSION_SETS, type PermissionSet } from '@/lib/permissions';
import { sendMail } from '@/lib/mail';
import type { Member } from '@/lib/types';

/**
 * Display order is derived from the title, not typed in. The e-board always
 * reads President first and the advisor last, and nobody should have to
 * remember a number to get that.
 */
const ORDER = [
  'President', 'Vice President', 'General Secretary', 'Treasurer',
  'Event Coordinator', 'Cultural Secretary', 'Sports Secretary',
  'Media Officer', 'Faculty Advisor', 'Administrator',
];
function orderFor(title: string) {
  const i = ORDER.findIndex((t) => t.toLowerCase() === title.toLowerCase());
  return i === -1 ? ORDER.length : i;
}

async function assertRoles(actor: Member) {
  if (!(await can(actor.id, 'roles'))) throw new Error('You cannot assign offices.');
}

export type Office = {
  id: string; member_id: string; member_name: string; member_email: string;
  photo_url: string | null; title: string; permission_set: PermissionSet;
  session: string; is_eboard: boolean; sort_order: number;
  started_at: string; ended_at: string | null;
};

export async function currentOffices(): Promise<Office[]> {
  return sql<Office[]>`
    select o.id, o.member_id, o.title, o.permission_set, o.session,
           o.is_eboard, o.sort_order, o.started_at::text, o.ended_at::text,
           m.full_name as member_name, m.email as member_email, m.photo_url
    from officer_roles o
    join members m on m.id = o.member_id
    where o.ended_at is null
    order by o.sort_order, o.title
  `;
}

export async function pastOffices(): Promise<Office[]> {
  return sql<Office[]>`
    select o.id, o.member_id, o.title, o.permission_set, o.session,
           o.is_eboard, o.sort_order, o.started_at::text, o.ended_at::text,
           m.full_name as member_name, m.email as member_email, m.photo_url
    from officer_roles o
    join members m on m.id = o.member_id
    where o.ended_at is not null
    order by o.ended_at desc
    limit 50
  `;
}

/**
 * Give someone an office.
 *
 * No credential is created, sent, or changed. The office attaches to the
 * account they already have and sign into. When it ends, their access ends —
 * without anyone editing their account or emailing a password.
 */
export async function assignOffice(
  actor: Member,
  o: { memberId: string; title: string; permissionSet: PermissionSet;
       session?: string | null; isEboard?: boolean; electionId?: string | null }
) {
  await assertRoles(actor);

  // Offices are always for the session currently running. Editing a past
  // board would rewrite history; the next one comes from an election.
  const [settings] = await sql<{ current_session: string }[]>`
    select current_session from settings where id = 1
  `;
  const session = o.session ?? settings.current_session;

  const [held] = await sql<{ title: string }[]>`
    select title from officer_roles
    where member_id = ${o.memberId} and ended_at is null
  `;
  // One office per person — deliberate, so permissions never quietly stack up.
  if (held) throw new Error(`They already hold the office of ${held.title}.`);

  const [row] = await sql<{ id: string }[]>`
    insert into officer_roles (member_id, session, title, permission_set,
                               is_eboard, sort_order, election_id)
    values (${o.memberId}, ${session}, ${o.title.trim()}, ${o.permissionSet},
            ${o.isEboard ?? true}, ${orderFor(o.title.trim())}, ${o.electionId ?? null})
    returning id
  `;

  await trackedCreate(actor.id, 'officer_roles', row.id, 'office.assign',
    { member_id: o.memberId });

  const [m] = await sql<{ full_name: string; email: string }[]>`
    select full_name, email from members where id = ${o.memberId}
  `;
  if (m) {
    const grants = PERMISSION_SETS[o.permissionSet];
    await sendMail({
      to: m.email,
      subject: `You are now ${o.title.trim()} — UTBSA`,
      text: `Assalamu alaikum ${m.full_name.split(' ')[0]},\n\n`
          + `You have taken office as ${o.title.trim()}.\n\n`
          + `${grants.description}\n\n`
          + `Nothing about how you sign in has changed — use the same email address `
          + `as always and you will see the new sections when you do.\n\n`
          + `— UTBSA`,
    });
  }

  return row.id;
}

/**
 * End an office.
 *
 * The person keeps their account and their history. Only the office moves,
 * and their access stops the moment it does.
 */
export async function endOffice(actor: Member, officeId: string, reason: string) {
  await assertRoles(actor);

  const [office] = await sql<any[]>`
    select o.*, m.full_name, m.email from officer_roles o
    join members m on m.id = o.member_id
    where o.id = ${officeId} and o.ended_at is null
  `;
  if (!office) throw new Error('That office is already vacant.');

  // Never leave the organisation with nobody who can assign offices.
  if (PERMISSION_SETS[office.permission_set as PermissionSet].grants.includes('roles')) {
    const [{ n }] = await sql<{ n: string }[]>`
      select count(*)::text n from officer_roles
      where ended_at is null and permission_set = 'full' and id <> ${officeId}
    `;
    if (Number(n) === 0) {
      throw new Error(
        'This is the last office with full access. Give someone else full access first, '
        + 'or nobody will be able to administer the site.'
      );
    }
  }

  await tracked(actor.id, 'officer_roles', officeId, 'office.end', async () => {
    await sql`update officer_roles set ended_at = now() where id = ${officeId}`;
  }, { reason });

  await sendMail({
    to: office.email,
    subject: `Your term as ${office.title} has ended — UTBSA`,
    text: `Assalamu alaikum ${office.full_name.split(' ')[0]},\n\n`
        + `Your term as ${office.title} has ended. Thank you for the work.\n\n`
        + `Your account is unchanged and you remain a member — you simply no longer `
        + `have the extra access the office carried.\n\n— UTBSA`,
  });
}

/**
 * Resign, and hand the office to whoever won it.
 *
 * This is the handover. It happens in one transaction so the office is never
 * vacant in between, and no credential is involved at any point.
 */
export async function resignTo(
  actor: Member,
  o: { officeId: string; successorMemberId: string; electionId?: string | null }
) {
  const [office] = await sql<any[]>`
    select o.*, m.full_name, m.email from officer_roles o
    join members m on m.id = o.member_id
    where o.id = ${o.officeId} and o.ended_at is null
  `;
  if (!office) throw new Error('That office is already vacant.');

  // Only the holder resigns their own office; anyone with roles access can
  // move someone else out, but that is endOffice, not this.
  if (office.member_id !== actor.id && !(await can(actor.id, 'roles'))) {
    throw new Error('Only the holder can resign this office.');
  }

  const [held] = await sql<{ title: string }[]>`
    select title from officer_roles
    where member_id = ${o.successorMemberId} and ended_at is null
  `;
  if (held) throw new Error(`Your successor already holds the office of ${held.title}.`);

  await sql.begin(async (tx) => {
    await tx`update officer_roles set ended_at = now() where id = ${o.officeId}`;
    await tx`
      insert into officer_roles (member_id, session, title, permission_set,
                                 is_eboard, sort_order, election_id)
      values (${o.successorMemberId}, ${office.session}, ${office.title},
              ${office.permission_set}, ${office.is_eboard}, ${office.sort_order},
              ${o.electionId ?? null})
    `;
  });

  await audit(actor.id, 'office.handover', 'member', o.successorMemberId,
              { title: office.title, from: office.member_id });

  const [successor] = await sql<{ full_name: string; email: string }[]>`
    select full_name, email from members where id = ${o.successorMemberId}
  `;

  await sendMail({
    to: office.email,
    subject: `You have handed over ${office.title} — UTBSA`,
    text: `Assalamu alaikum ${office.full_name.split(' ')[0]},\n\n`
        + `You have handed the office of ${office.title} to ${successor?.full_name}. `
        + `Thank you for your term.\n\n`
        + `Your account is unchanged and you remain a member.\n\n— UTBSA`,
  });

  if (successor) {
    await sendMail({
      to: successor.email,
      subject: `You are now ${office.title} — UTBSA`,
      text: `Assalamu alaikum ${successor.full_name.split(' ')[0]},\n\n`
          + `${office.full_name} has handed over, and you are now ${office.title}.\n\n`
          + `Sign in with the same email address you always use — there is no new `
          + `password, and nothing to look up. The extra sections appear once you do.\n\n`
          + `— UTBSA`,
    });
  }
}

/** After a closed election: who won what, and who currently holds it. */
export async function handoverPlan(electionId: string) {
  return sql<any[]>`
    with tally as (
      select bc.position_id, bc.nomination_id, count(*)::int as votes
      from ballot_choices bc
      join ballots b on b.id = bc.ballot_id
      where b.election_id = ${electionId} and bc.nomination_id is not null
      group by bc.position_id, bc.nomination_id
    ),
    ranked as (
      select *, row_number() over (partition by position_id order by votes desc) as rn
      from tally
    )
    select p.id as position_id, p.title, p.permission_set,
           n.member_id as winner_id, wm.full_name as winner_name,
           r.votes,
           o.id as current_office_id, o.member_id as current_holder_id,
           hm.full_name as current_holder_name,
           (select count(*) from ranked r2
            where r2.position_id = p.id and r2.rn = 1 and r2.votes = r.votes) as tied
    from election_positions p
    left join ranked r on r.position_id = p.id and r.rn = 1
    left join nominations n on n.id = r.nomination_id
    left join members wm on wm.id = n.member_id
    left join officer_roles o on o.title = p.title and o.ended_at is null
    left join members hm on hm.id = o.member_id
    where p.election_id = ${electionId}
    order by p.sort_order, p.title
  `;
}
