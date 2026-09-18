import 'server-only';
import { sql } from '@/lib/db';
import { audit } from '@/lib/audit';
import { sendMail } from '@/lib/mail';
import type { Member } from '@/lib/types';

/**
 * Households exist for ATTENDANCE, not money.
 *
 * Two people, one car, two plates — so one RSVP. Dues remain per-student and
 * nothing in this file touches dues_charges, payments, or adjustments.
 *
 * Linking is consented in both directions: one person asks, the other
 * accepts, either can leave. Without that, anyone could declare themselves
 * your spouse and start answering invitations on your behalf.
 */

export type HouseholdMember = {
  id: string; full_name: string; email: string;
  photo_url: string | null; member_type: string;
};

export type HouseholdInvite = {
  id: string; from_member: string; to_member: string;
  from_name: string; to_name: string; message: string | null;
  status: string; created_at: string;
};

export async function householdOf(memberId: string): Promise<HouseholdMember[]> {
  const [m] = await sql<{ household_id: string | null }[]>`
    select household_id from members where id = ${memberId}
  `;
  if (!m?.household_id) return [];
  return sql<HouseholdMember[]>`
    select id, full_name, email, photo_url, member_type
    from members where household_id = ${m.household_id}
    order by created_at
  `;
}

export async function pendingInvites(memberId: string) {
  const incoming = await sql<HouseholdInvite[]>`
    select i.*, f.full_name as from_name, t.full_name as to_name
    from household_invites i
    join members f on f.id = i.from_member
    join members t on t.id = i.to_member
    where i.to_member = ${memberId} and i.status = 'pending'
  `;
  const outgoing = await sql<HouseholdInvite[]>`
    select i.*, f.full_name as from_name, t.full_name as to_name
    from household_invites i
    join members f on f.id = i.from_member
    join members t on t.id = i.to_member
    where i.from_member = ${memberId} and i.status = 'pending'
  `;
  return { incoming, outgoing };
}

export async function inviteToHousehold(actor: Member, targetId: string, message: string | null) {
  if (targetId === actor.id) throw new Error('You cannot link to yourself.');

  const [target] = await sql<{ id: string; full_name: string; email: string; household_id: string | null }[]>`
    select id, full_name, email, household_id from members
    where id = ${targetId} and status in ('active','inactive','alumni')
  `;
  if (!target) throw new Error('That member was not found.');

  const mine = await householdOf(actor.id);
  if (target.household_id && mine.some((m) => m.id === target.id)) {
    throw new Error('You are already in the same household.');
  }
  if (target.household_id) {
    throw new Error(`${target.full_name} is already linked to another household. They need to leave it first.`);
  }

  await sql`
    insert into household_invites (from_member, to_member, message)
    values (${actor.id}, ${targetId}, ${message})
  `;

  await sendMail({
    to: target.email,
    subject: `${actor.full_name} would like to link your UTBSA accounts`,
    text: `Hello ${target.full_name.split(' ')[0]},\n\n`
        + `${actor.full_name} has asked to link your UTBSA accounts as one household.\n\n`
        + `That means one of you answers an invitation for both, and you get one email `
        + `per event instead of two. It does not affect dues — those stay separate.\n\n`
        + (message ? `They added: "${message}"\n\n` : '')
        + `Accept or decline in your profile. Either of you can undo it later.\n\n— UTBSA`,
  });

  await audit(actor.id, 'household.invite', 'member', targetId);
}

export async function respondToInvite(actor: Member, inviteId: string, accept: boolean) {
  const [invite] = await sql<any[]>`
    select i.*, f.full_name as from_name, f.email as from_email, f.household_id as from_household
    from household_invites i
    join members f on f.id = i.from_member
    where i.id = ${inviteId} and i.to_member = ${actor.id} and i.status = 'pending'
  `;
  if (!invite) throw new Error('That invitation is no longer open.');

  if (!accept) {
    await sql`update household_invites set status='declined', decided_at=now() where id=${inviteId}`;
    return;
  }

  await sql.begin(async (tx) => {
    let householdId = invite.from_household as string | null;

    if (!householdId) {
      const [h] = await tx<{ id: string }[]>`
        insert into households (label) values (${invite.from_name}) returning id
      `;
      householdId = h.id;
      await tx`update members set household_id = ${householdId} where id = ${invite.from_member}`;
    }

    await tx`update members set household_id = ${householdId} where id = ${actor.id}`;
    await tx`update household_invites set status='accepted', decided_at=now() where id=${inviteId}`;
  });

  await sendMail({
    to: invite.from_email,
    subject: `${actor.full_name} accepted the household link`,
    text: `Your UTBSA accounts are now linked as one household. Either of you can `
        + `answer an invitation for both, and you will get one email per event `
        + `rather than two.\n\nDues are unaffected and remain separate.\n\n— UTBSA`,
  });

  await audit(actor.id, 'household.accept', 'member', invite.from_member);
}

export async function cancelInvite(actor: Member, inviteId: string) {
  const [row] = await sql<{ id: string }[]>`
    update household_invites set status='cancelled', decided_at=now()
    where id=${inviteId} and from_member=${actor.id} and status='pending'
    returning id
  `;
  if (!row) throw new Error('That invitation is no longer open.');
}

/** Either person can walk away. Their RSVPs stay with whoever answered them. */
export async function leaveHousehold(actor: Member) {
  const members = await householdOf(actor.id);
  if (!members.length) throw new Error('You are not in a household.');

  await sql.begin(async (tx) => {
    await tx`update members set household_id = null where id = ${actor.id}`;
    // A household of one is just a person.
    if (members.length <= 2) {
      const other = members.find((m) => m.id !== actor.id);
      if (other) await tx`update members set household_id = null where id = ${other.id}`;
    }
  });

  await audit(actor.id, 'household.leave', 'member', actor.id);
}

/** Who to send one invitation to, rather than one per person. */
export async function invitationRecipients() {
  return sql<{ email: string; full_name: string; household_id: string | null }[]>`
    select distinct on (coalesce(household_id::text, id::text))
           email, full_name, household_id
    from members
    where status = 'active'
    order by coalesce(household_id::text, id::text), created_at
  `;
}
