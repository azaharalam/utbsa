import 'server-only';
import { sql } from '@/lib/db';

/**
 * Write an audit entry. Deliberately fire-and-forget: a logging failure must
 * never break the action the member was actually trying to do.
 */
export async function audit(
  actorId: string | null,
  action: string,
  entity?: string,
  entityId?: string,
  detail?: Record<string, string | number | boolean | null>
) {
  try {
    await sql`
      insert into audit_log (actor_id, action, entity, entity_id, detail)
      values (${actorId}, ${action}, ${entity ?? null}, ${entityId ?? null},
              ${detail ? sql.json(detail) : null})
    `;
  } catch (e) {
    console.error('audit log failed', e);
  }
}
