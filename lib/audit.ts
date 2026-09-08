import 'server-only';
import { sql } from '@/lib/db';

/**
 * ─────────────────────────────────────────────────────────────
 * The log records the USE OF POWER, not participation.
 *
 * What matters is the scope of the action, not who performed it. A president
 * linking their household, volunteering for an airport run, or RSVPing to a
 * picnic is acting as a member — they happen to hold an office, but nothing
 * about that action touches anyone else's account.
 * ─────────────────────────────────────────────────────────────
 */
const MEMBER_SCOPE = new Set([
  'auth.login', 'member.signup',
  'household.invite', 'household.accept', 'household.decline', 'household.leave',
  'arrival.claim', 'arrival.release', 'arrival.done', 'arrival.cancel',
  'rsvp.set', 'rsvp.cancel',
  'potluck.claim', 'potluck.release',
  'giveaway.post', 'giveaway.claim',
  'housing.post', 'housing.close',
  'job.post', 'job.close',
  'nomination.self', 'nomination.withdraw',
]);

/**
 * Never written to the log, even as a "before" value.
 *
 * Session and token hashes would let anyone with log access impersonate a
 * member. Ballot references would break election secrecy. The rest is noise
 * that makes every diff look like a change.
 */
const NEVER_LOG = new Set([
  'token_hash', 'password', 'secret', 'session_id',
  'updated_at', 'created_at', 'search_vector',
]);

/** Fields worth showing as money rather than a raw integer. */
const MONEY_FIELDS = /(_cents|amount)$/;

export type Operation = 'create' | 'update' | 'delete';

export type FieldChange = { field: string; from: unknown; to: unknown };

type Row = Record<string, unknown> | null | undefined;

/** Strip anything that must not be stored, and anything that is just noise. */
function clean(row: Row): Record<string, unknown> | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (NEVER_LOG.has(k)) continue;
    out[k] = v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

/** What actually moved between two versions of a row. */
export function diff(before: Row, after: Row): FieldChange[] {
  const a = clean(before) ?? {};
  const b = clean(after) ?? {};
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));

  const changes: FieldChange[] = [];
  for (const k of keys) {
    const from = a[k] ?? null;
    const to = b[k] ?? null;
    if (JSON.stringify(from) === JSON.stringify(to)) continue;
    changes.push({ field: k, from, to });
  }
  return changes;
}

/** Read a row so it can be compared before and after. */
export async function snapshot(table: string, id: string): Promise<Row> {
  const rows = await sql.unsafe(`select * from ${table} where id = $1`, [id]);
  return (rows[0] as Record<string, unknown>) ?? null;
}

/**
 * The general form. Everything else in this file is a shortcut to it.
 *
 * `before` and `after` are both stored so that a future question the display
 * does not currently answer can still be answered from the record.
 */
export async function auditChange(
  actorId: string | null,
  action: string,
  opts: {
    operation: Operation;
    entity?: string;
    entityId?: string;
    before?: Row;
    after?: Row;
    detail?: Record<string, string | number | boolean | null>;
  }
) {
  if (MEMBER_SCOPE.has(action)) return;

  const before = clean(opts.before);
  const after = clean(opts.after);
  const changes = opts.operation === 'update' ? diff(before, after)
                : opts.operation === 'create' ? diff(null, after)
                : diff(before, null);

  // An update that changed nothing is not worth a line.
  if (opts.operation === 'update' && changes.length === 0) return;

  try {
    await sql`
      insert into audit_log (
        actor_id, actor_role, action, operation, entity, entity_id,
        before_data, after_data, changed, detail
      ) values (
        ${actorId},
        (select title from officer_roles
         where member_id = ${actorId} and ended_at is null
         order by sort_order limit 1),
        ${action}, ${opts.operation}, ${opts.entity ?? null}, ${opts.entityId ?? null},
        ${before ? sql.json(before as any) : null},
        ${after ? sql.json(after as any) : null},
        ${sql.json(changes as any)},
        ${opts.detail ? sql.json(opts.detail) : null}
      )
    `;
  } catch (e) {
    console.error('audit log failed', e);
  }
}

/**
 * Wrap a write so the before and after are captured automatically.
 *
 *   await tracked(actor, 'members', id, 'member.status', async () => {
 *     await sql`update members set status = ${s} where id = ${id}`;
 *   });
 *
 * This is the point of the helper: nobody has to remember to snapshot, so
 * the log cannot quietly drift out of step with the code.
 */
export async function tracked<T>(
  actorId: string | null,
  table: string,
  id: string,
  action: string,
  fn: () => Promise<T>,
  detail?: Record<string, string | number | boolean | null>
): Promise<T> {
  const before = await snapshot(table, id);
  const result = await fn();
  const after = await snapshot(table, id);

  await auditChange(actorId, action, {
    operation: !before ? 'create' : !after ? 'delete' : 'update',
    entity: table, entityId: id, before, after, detail,
  });

  return result;
}

/** A row that has just been inserted. */
export async function trackedCreate(
  actorId: string | null, table: string, id: string, action: string,
  detail?: Record<string, string | number | boolean | null>
) {
  const after = await snapshot(table, id);
  await auditChange(actorId, action, {
    operation: 'create', entity: table, entityId: id, after, detail,
  });
}

/** Snapshot before deleting, since afterwards there is nothing to read. */
export async function trackedDelete(
  actorId: string | null, table: string, id: string, action: string,
  fn: () => Promise<void>,
  detail?: Record<string, string | number | boolean | null>
) {
  const before = await snapshot(table, id);
  await fn();
  await auditChange(actorId, action, {
    operation: 'delete', entity: table, entityId: id, before, detail,
  });
}

/** Backwards-compatible plain entry, for actions with no row behind them. */
export async function audit(
  actorId: string | null,
  action: string,
  entity?: string,
  entityId?: string,
  detail?: Record<string, string | number | boolean | null>
) {
  if (MEMBER_SCOPE.has(action)) return;

  try {
    await sql`
      insert into audit_log (actor_id, actor_role, action, entity, entity_id, detail)
      values (
        ${actorId},
        (select title from officer_roles
         where member_id = ${actorId} and ended_at is null
         order by sort_order limit 1),
        ${action}, ${entity ?? null}, ${entityId ?? null},
        ${detail ? sql.json(detail) : null}
      )
    `;
  } catch (e) {
    console.error('audit log failed', e);
  }
}

export { MONEY_FIELDS };
