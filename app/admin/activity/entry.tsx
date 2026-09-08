'use client';

import { useState } from 'react';
import { fieldLabel, formatValue, visibleChanges } from '@/lib/audit-display';
import type { AuditEntry } from '@/lib/queries/inbox';

const OP_TONE: Record<string, string> = {
  create: 'text-kantha', update: 'text-nil', delete: 'text-alta',
};

/**
 * One row of the log, with its diff.
 *
 * "Changed a status" is not an answer. "status: pending → active" is. The
 * before value is the whole point — without it the log tells you something
 * happened and nothing else.
 */
export default function Entry({ entry, verb }: { entry: AuditEntry; verb: string }) {
  const [open, setOpen] = useState(false);
  const changes = visibleChanges(entry.changed);
  const detail = entry.detail as Record<string, any> | null;

  const when = new Date(entry.created_at).toLocaleString('en-US', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });

  return (
    <li className="border-b border-muslin-deep py-3 last:border-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-semibold">{entry.actor_name ?? 'Someone'}</span>
        {entry.actor_role && (
          <span className="text-xs text-kantha">{entry.actor_role}</span>
        )}
        <span className="text-ink-mid">{verb}</span>
        {entry.subject && <span className="font-semibold">{entry.subject}</span>}
        {entry.operation && (
          <span className={`text-xs font-semibold uppercase ${OP_TONE[entry.operation]}`}>
            {entry.operation}
          </span>
        )}
        <span className="ml-auto whitespace-nowrap text-xs text-ink-mid">{when}</span>
      </div>

      {detail?.reason && (
        <p className="mt-1 text-sm text-ink-mid">&ldquo;{detail.reason}&rdquo;</p>
      )}

      {changes.length > 0 && (
        <>
          {/* The first two changes inline — usually that is the whole story. */}
          <ul className="mt-1.5 space-y-0.5">
            {changes.slice(0, open ? changes.length : 2).map((c) => (
              <li key={c.field} className="text-sm">
                <span className="text-ink-mid">{fieldLabel(c.field)}: </span>
                {entry.operation === 'create' ? (
                  <span className="font-medium">{formatValue(c.field, c.to)}</span>
                ) : entry.operation === 'delete' ? (
                  <span className="text-ink-mid line-through">{formatValue(c.field, c.from)}</span>
                ) : (
                  <>
                    <span className="text-ink-mid line-through">{formatValue(c.field, c.from)}</span>
                    <span className="mx-1.5 text-ink-mid">→</span>
                    <span className="font-medium">{formatValue(c.field, c.to)}</span>
                  </>
                )}
              </li>
            ))}
          </ul>

          {changes.length > 2 && (
            <button onClick={() => setOpen(!open)}
              className="mt-1 text-xs font-semibold text-kantha">
              {open ? 'Show less' : `${changes.length - 2} more field${changes.length - 2 === 1 ? '' : 's'}`}
            </button>
          )}
        </>
      )}
    </li>
  );
}
