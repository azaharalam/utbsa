import 'server-only';
import { sql } from '@/lib/db';
import { can } from '@/lib/permissions';
import { audit, tracked, trackedCreate } from '@/lib/audit';
import type { Member, DirectoryEntry, MemberStatus } from '@/lib/types';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * AUTHORIZATION LIVES HERE.
 *
 * There is no row-level security in this app. Postgres will happily hand any
 * query whatever it asks for. The rules below are the only thing standing
 * between a member and everyone else's phone number.
 *
 * Two rules to keep it that way:
 *   1. Pages and actions never write raw SQL against `members`. They call
 *      these functions.
 *   2. Any function that can return another person's data takes the actor as
 *      its first argument and checks them.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Any of a member's addresses signs them in. This is what makes graduation a
 * non-event: when the university account dies they simply use the other one,
 * and it is the same account with the same history.
 */
export async function findByEmail(email: string): Promise<Member | null> {
  const e = email.trim().toLowerCase();
  const rows = await sql<Member[]>`
    select * from members
    where lower(email) = ${e}
       or lower(university_email) = ${e}
       or lower(personal_email) = ${e}
    limit 1
  `;
  return rows[0] ?? null;
}

export async function findById(id: string): Promise<Member | null> {
  const rows = await sql<Member[]>`select * from members where id = ${id} limit 1`;
  return rows[0] ?? null;
}

export async function createPending(input: {
  full_name: string; member_type: string;
  university_email?: string | null; personal_email?: string | null;
  phone?: string | null; heard_from?: string | null;
}): Promise<Member> {
  // `email` is the address we WRITE to, and it is the personal one for
  // everybody. The university quarantines mail from an unfamiliar domain, so
  // a sign-in link sent to a @rockets address never arrives.
  const contact = input.personal_email ?? input.university_email;

  if (!contact) throw new Error('An email address is required.');

  const rows = await sql<Member[]>`
    insert into members (full_name, email, university_email, personal_email,
                         member_type, phone, heard_from)
    values (${input.full_name}, ${contact.toLowerCase()},
            ${input.university_email?.toLowerCase() ?? null},
            ${input.personal_email?.toLowerCase() ?? null},
            ${input.member_type}, ${input.phone ?? null}, ${input.heard_from ?? null})
    returning *
  `;
  return rows[0];
}

/** An admin editing somebody else's record — always logged with the diff. */
export async function adminUpdateMember(
  actor: Member, id: string, fields: Record<string, string | number | null>
) {
  await assertAdmin(actor);
  await tracked(actor.id, 'members', id, 'member.edit', async () => {
    const entries = Object.entries(fields);
    if (!entries.length) return;
    await sql`update members set ${sql(fields as any, ...Object.keys(fields))} where id = ${id}`;
  });
}

/** Keep the send-to address in step with the member's type. Called whenever
 *  a type changes, so graduation needs no separate migration. */
export async function refreshContactEmail(memberId: string) {
  await sql`
    update members
    set email = coalesce(personal_email, university_email, email)
    where id = ${memberId}
  `;
}

export async function markEmailVerified(id: string) {
  await sql`update members set email_verified_at = now() where id = ${id} and email_verified_at is null`;
}

export async function touchLastSeen(id: string) {
  await sql`update members set last_seen_at = now() where id = ${id}`;
}

/** Fields a member is allowed to change about themselves. Note what is absent:
 *  role, status, email, approved_at — and personal_email.
 *
 *  personal_email is where every sign-in link goes. Editable from inside the
 *  account, anyone who borrowed a signed-in phone could point it at their own
 *  inbox and hold the account permanently. An admin changes it instead. */
export type SelfEditable = {
  full_name: string;
  university_email: string | null;
  phone: string | null;
  member_type: string;
  student_level: string | null;
  department: string | null;
  hometown_bd: string | null;
  arrival_semester: string | null;
  arrival_year: number | null;
  bio: string | null;
  linkedin_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

export async function updateSelf(id: string, p: SelfEditable) {
  await sql`
    update members set
      full_name = ${p.full_name},
      university_email = ${p.university_email},
      phone = ${p.phone},
      member_type = ${p.member_type},
      student_level = ${p.student_level},
      department = ${p.department},
      hometown_bd = ${p.hometown_bd},
      arrival_semester = ${p.arrival_semester},
      arrival_year = ${p.arrival_year},
      bio = ${p.bio},
      linkedin_url = ${p.linkedin_url},
      emergency_contact_name = ${p.emergency_contact_name},
      emergency_contact_phone = ${p.emergency_contact_phone}
    where id = ${id}
  `;
}

export async function updateVisibility(id: string, v: {
  show_email: boolean; show_phone: boolean; show_photo: boolean;
  show_department: boolean; show_hometown: boolean; in_directory: boolean;
}) {
  await sql`
    update members set
      show_email = ${v.show_email},
      show_phone = ${v.show_phone},
      show_photo = ${v.show_photo},
      show_department = ${v.show_department},
      show_hometown = ${v.show_hometown},
      in_directory = ${v.in_directory}
    where id = ${id}
  `;
}

export async function setPhoto(id: string, url: string) {
  await sql`update members set photo_url = ${url} where id = ${id}`;
}

/**
 * The directory.
 *
 * `actor` must be an approved member — callers pass the result of
 * requireApproved(). Each privacy flag is applied in the SELECT, so a column
 * the member switched off never leaves the database. Do not "optimise" this
 * into `select *`.
 */
export async function directory(actor: Member, q = ''): Promise<DirectoryEntry[]> {
  if (actor.status === 'pending' || actor.status === 'rejected') return [];

  const term = `%${q.trim()}%`;
  return sql<DirectoryEntry[]>`
    select
      id, full_name, member_type, student_level, arrival_semester, arrival_year,
      case when show_photo      then photo_url   end as photo_url,
      case when show_email      then email       end as email,
      case when show_phone      then phone       end as phone,
      case when show_department then department  end as department,
      case when show_hometown   then hometown_bd end as hometown_bd
    from members
    where status in ('active','alumni')
      and in_directory
      and (${q.trim() === ''} or full_name ilike ${term}
                              or department ilike ${term}
                              or hometown_bd ilike ${term})
    order by full_name
  `;
}

// ───────────────────────── admin only ─────────────────────────
// Every function below asserts the actor is an admin. Belt and braces:
// the pages already sit behind requireAdmin(), but a server action is a
// public HTTP endpoint and must never trust its caller.

/**
 * Access comes from the office someone holds, never from a flag on their
 * account. The page guard already checked this, but a server action is a
 * public HTTP endpoint — it must never trust its caller.
 */
async function assertAdmin(actor: Member) {
  if (actor.status !== 'active' || !(await can(actor.id, 'members'))) {
    throw new Error('You do not have access to this.');
  }
}

export async function listPending(actor: Member): Promise<Member[]> {
  await assertAdmin(actor);
  return sql<Member[]>`select * from members where status = 'pending' order by created_at`;
}

export async function listAll(actor: Member, opts: { status?: string; q?: string } = {}) {
  await assertAdmin(actor);
  const term = `%${(opts.q ?? '').trim()}%`;
  const hasQ = (opts.q ?? '').trim() !== '';
  return sql<Member[]>`
    select * from members
    where (${!opts.status} or status = ${opts.status ?? ''})
      and (${!hasQ} or full_name ilike ${term} or email ilike ${term} or department ilike ${term})
    order by full_name
  `;
}

export async function statusCounts(actor: Member) {
  await assertAdmin(actor);
  const rows = await sql<{ status: MemberStatus; n: string }[]>`
    select status, count(*)::text as n from members group by status
  `;
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])) as Record<string, number>;
}

export async function approve(actor: Member, id: string) {
  await assertAdmin(actor);
  let approved: Member | undefined;

  await tracked(actor.id, 'members', id, 'member.approve', async () => {
    const rows = await sql<Member[]>`
      update members
      set status = 'active', approved_at = now(), approved_by = ${actor.id},
          rejected_reason = null
      where id = ${id} and status = 'pending'
      returning *
    `;
    approved = rows[0];
  });

  return approved ?? null;
}

export async function reject(actor: Member, id: string, reason: string) {
  await assertAdmin(actor);
  await tracked(actor.id, 'members', id, 'member.reject', async () => {
    await sql`update members set status = 'rejected', rejected_reason = ${reason} where id = ${id}`;
  }, { reason });
}

export async function setStatus(actor: Member, id: string, status: MemberStatus) {
  await assertAdmin(actor);
  // Guard against the last admin locking everyone out of the admin area.
  if (id === actor.id && status !== 'active') throw new Error('You cannot deactivate yourself.');
  await tracked(actor.id, 'members', id, 'member.status', async () => {
    await sql`update members set status = ${status} where id = ${id}`;
  });
}

/**
 * Removed. A member's access comes from the office they hold, assigned at
 * /admin/offices — never from a flag toggled on their account.
 */
