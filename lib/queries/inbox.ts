import 'server-only';
import { sql } from '@/lib/db';
import { audit } from '@/lib/audit';
import { can } from '@/lib/permissions';
import type { Member } from '@/lib/types';
import { SPAM_THRESHOLD } from '@/lib/spam';

async function assertMembers(actor: Member) {
  if (actor.status !== 'active' || !(await can(actor.id, 'members'))) {
    throw new Error('You do not have access to this.');
  }
}

export type Message = {
  id: string; name: string; email: string;
  kind: string; member_id: string | null; member_status?: string | null;
  subject: string | null; message: string;
  handled: boolean; handled_by_name: string | null;
  handled_at: string | null; created_at: string;
  spam_score: number; spam_reasons: string | null;
};

/**
 * Scored messages are hidden from the main list, not deleted.
 *
 * A scoring mistake that hides a real member's message costs somebody a week.
 * One that deletes it costs a member who wrote to the e-board, heard nothing,
 * and will not write again. So: quarantine, visible under "Filtered".
 */
export async function messages(
  actor: Member,
  showHandled = false,
  showSpam = false,
): Promise<Message[]> {
  await assertMembers(actor);
  return sql<Message[]>`
    select c.*, m.full_name as handled_by_name, sub.status as member_status
    from contact_messages c
    left join members m on m.id = c.handled_by
    left join members sub on sub.id = c.member_id
    where (${showHandled} or not c.handled)
      and (${showSpam} or c.spam_score < ${SPAM_THRESHOLD})
    order by c.created_at desc
    limit 200
  `;
}

/** How many are sitting in the filtered list, so the tab can say so. */
export async function filteredCount(actor: Member): Promise<number> {
  await assertMembers(actor);
  const [row] = await sql<{ n: string }[]>`
    select count(*)::text n from contact_messages
    where spam_score >= ${SPAM_THRESHOLD} and not handled
  `;
  return Number(row?.n ?? 0);
}

export async function setHandled(actor: Member, id: string, handled: boolean) {
  await assertMembers(actor);
  await sql`
    update contact_messages
    set handled = ${handled},
        handled_by = ${handled ? actor.id : null},
        handled_at = ${handled ? new Date() : null}
    where id = ${id}
  `;
  await audit(actor.id, handled ? 'message.handled' : 'message.reopened',
              'message', id);
}

/**
 * A rejected member asking to be reconsidered.
 *
 * Attached to their account, so whoever reads it can see the record and the
 * reason they were turned down rather than starting from a name in a form.
 */
export async function appeal(memberId: string, message: string) {
  if (!message.trim()) throw new Error('Tell us what you would like us to know.');

  const [m] = await sql<{ full_name: string; email: string; status: string }[]>`
    select full_name, email, status from members where id = ${memberId}
  `;
  if (!m) throw new Error('Account not found.');
  if (m.status !== 'rejected') throw new Error('Your membership is not in that state.');

  const [recent] = await sql<{ id: string }[]>`
    select id from contact_messages
    where member_id = ${memberId} and kind = 'appeal' and not handled
    limit 1
  `;
  if (recent) {
    throw new Error('You already have a message waiting with the e-board. They will reply.');
  }

  await sql`
    insert into contact_messages (name, email, subject, message, member_id, kind)
    values (${m.full_name}, ${m.email},
            'Asking us to look again', ${message.trim()}, ${memberId}, 'appeal')
  `;
}

// ───────────────────────── audit log ─────────────────────────

export type AuditEntry = {
  id: string; actor_name: string | null; actor_role: string | null; action: string;
  operation: 'create' | 'update' | 'delete' | null;
  entity: string | null; entity_id: string | null;
  subject: string | null;
  changed: unknown; before_data: unknown; after_data: unknown;
  detail: Record<string, unknown> | null; created_at: string;
};

/**
 * Everything an officer has done.
 *
 * Voting is absent by design — a trail linking a member to a ballot would be a
 * back door through the secrecy the election design exists to protect.
 */
export async function activity(
  actor: Member,
  opts: { action?: string; actorId?: string; limit?: number } = {}
): Promise<AuditEntry[]> {
  if (actor.status !== 'active' || !(await can(actor.id, 'roles'))) {
    throw new Error('You do not have access to this.');
  }
  return sql<AuditEntry[]>`
    select a.id, a.action, a.operation, a.entity, a.entity_id, a.detail,
           a.created_at::text, a.actor_role, a.changed, a.before_data, a.after_data,
           m.full_name as actor_name,
           -- Whose record was touched, where that is knowable.
           coalesce(
             subject.full_name,
             a.after_data->>'title',
             a.after_data->>'dish',
             a.after_data->>'name',
             a.before_data->>'title',
             a.before_data->>'dish',
             a.before_data->>'name'
           ) as subject
    from audit_log a
    left join members m on m.id = a.actor_id
    left join members subject on subject.id = coalesce(
      nullif(a.after_data->>'member_id', '')::uuid,
      nullif(a.detail->>'member_id', '')::uuid,
      case when a.entity = 'members' then a.entity_id::uuid end
    )
    where (${!opts.action}  or a.action like ${(opts.action ?? '') + '%'})
      and (${!opts.actorId} or a.actor_id = ${opts.actorId ?? null})
    order by a.created_at desc
    limit ${opts.limit ?? 200}
  `;
}

/** A summary, not a scoreboard. Governance, not surveillance. */
export async function activitySummary(actor: Member) {
  if (actor.status !== 'active' || !(await can(actor.id, 'roles'))) {
    throw new Error('You do not have access to this.');
  }
  const rows = await sql<{ action: string; n: string }[]>`
    select action, count(*)::text n from audit_log
    where created_at > now() - interval '90 days'
    group by action order by count(*) desc limit 12
  `;
  return rows.map((r) => ({ action: r.action, count: Number(r.n) }));
}

/** Audit logs are a liability if kept forever. Three years covers any
 *  handover question and no more. */
export async function purgeOldAudit() {
  const rows = await sql`delete from audit_log where created_at < now() - interval '3 years'`;
  return rows.count;
}
