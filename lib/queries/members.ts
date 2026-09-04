import 'server-only';
import { sql } from '@/lib/db';
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

export async function findByEmail(email: string): Promise<Member | null> {
  const rows = await sql<Member[]>`
    select * from members where lower(email) = lower(${email}) limit 1
  `;
  return rows[0] ?? null;
}

export async function findById(id: string): Promise<Member | null> {
  const rows = await sql<Member[]>`select * from members where id = ${id} limit 1`;
  return rows[0] ?? null;
}

export async function createPending(input: {
  full_name: string; email: string; phone?: string | null; heard_from?: string | null;
}): Promise<Member> {
  const rows = await sql<Member[]>`
    insert into members (full_name, email, phone, heard_from)
    values (${input.full_name}, ${input.email.toLowerCase()},
            ${input.phone ?? null}, ${input.heard_from ?? null})
    returning *
  `;
  return rows[0];
}

export async function markEmailVerified(id: string) {
  await sql`update members set email_verified_at = now() where id = ${id} and email_verified_at is null`;
}

export async function touchLastSeen(id: string) {
  await sql`update members set last_seen_at = now() where id = ${id}`;
}

/** Fields a member is allowed to change about themselves. Note what is absent:
 *  role, status, email, approved_at. Those are not in this list on purpose. */
export type SelfEditable = {
  full_name: string;
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
      id, full_name, member_type, student_level,
      arrival_semester, arrival_year,
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

function assertAdmin(actor: Member) {
  if (actor.role !== 'admin' || actor.status !== 'active') {
    throw new Error('Admins only.');
  }
}

export async function listPending(actor: Member): Promise<Member[]> {
  assertAdmin(actor);
  return sql<Member[]>`select * from members where status = 'pending' order by created_at`;
}

export async function listAll(actor: Member, opts: { status?: string; q?: string } = {}) {
  assertAdmin(actor);
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
  assertAdmin(actor);
  const rows = await sql<{ status: MemberStatus; n: string }[]>`
    select status, count(*)::text as n from members group by status
  `;
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])) as Record<string, number>;
}

export async function approve(actor: Member, id: string) {
  assertAdmin(actor);
  const rows = await sql<Member[]>`
    update members
    set status = 'active', approved_at = now(), approved_by = ${actor.id}, rejected_reason = null
    where id = ${id} and status = 'pending'
    returning *
  `;
  return rows[0] ?? null;
}

export async function reject(actor: Member, id: string, reason: string) {
  assertAdmin(actor);
  await sql`update members set status = 'rejected', rejected_reason = ${reason} where id = ${id}`;
}

export async function setStatus(actor: Member, id: string, status: MemberStatus) {
  assertAdmin(actor);
  // Guard against the last admin locking everyone out of the admin area.
  if (id === actor.id && status !== 'active') throw new Error('You cannot deactivate yourself.');
  await sql`update members set status = ${status} where id = ${id}`;
}

export async function setRole(actor: Member, id: string, role: 'member' | 'admin') {
  assertAdmin(actor);
  if (id === actor.id && role !== 'admin') {
    const [{ n }] = await sql<{ n: string }[]>`
      select count(*)::text as n from members where role = 'admin' and status = 'active'
    `;
    if (Number(n) <= 1) throw new Error('You are the only admin. Promote someone else first.');
  }
  await sql`update members set role = ${role} where id = ${id}`;
}
