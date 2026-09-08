/**
 * Turning a stored diff into something a person can read.
 * Shared between server and client — nothing server-only here.
 */

export type FieldChange = { field: string; from: unknown; to: unknown };

const LABEL: Record<string, string> = {
  status: 'status', member_type: 'member type', full_name: 'name',
  email: 'contact email', university_email: 'UToledo email',
  personal_email: 'personal email', phone: 'phone',
  dues_cents: 'dues rate', amount_cents: 'amount', covers: 'covers',
  permission_set: 'access', title: 'title', session: 'session',
  is_public: 'public', is_potluck: 'potluck', is_published: 'published',
  is_restricted: 'restricted', show_publicly: 'listed publicly',
  claimed_by: 'claimed by', ended_at: 'ended', approved_at: 'approved',
  acknowledged_at: 'thanked', published_at: 'published',
  dues_assessed_at: 'dues assessed', rejected_reason: 'reason',
  decline_reason: 'reason', current_session: 'current session',
  fund_id: 'fund', category: 'category', dish: 'dish', body: 'body',
  description: 'description', note: 'note', location_name: 'venue',
  starts_at: 'start time', ends_at: 'end time', slug: 'URL',
};

/** Long text is summarised — nobody wants a blog post inside a log row. */
const LONG = new Set(['body', 'description', 'blurb', 'bio', 'message', 'excerpt']);

export function fieldLabel(f: string) {
  return LABEL[f] ?? f.replace(/_/g, ' ');
}

export function formatValue(field: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';

  if (/_cents$/.test(field) && typeof v === 'number') {
    return `$${(v / 100).toFixed(2)}`;
  }

  if (typeof v === 'string') {
    if (LONG.has(field)) {
      const n = v.trim().length;
      return `${n} character${n === 1 ? '' : 's'}`;
    }
    // Timestamps read better as dates.
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
      return new Date(v).toLocaleString('en-US', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      });
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v)) return v.slice(0, 8) + '…';
    return v.length > 60 ? v.slice(0, 60) + '…' : v;
  }

  return String(v);
}

/** Fields not worth showing in a diff — internal plumbing. */
const HIDE = new Set(['id', 'sort_order', 'reviewed_at', 'reviewed_by',
                      'claimed_at', 'decided_at', 'approved_by', 'created_by']);

export function visibleChanges(changed: unknown): FieldChange[] {
  if (!Array.isArray(changed)) return [];
  return (changed as FieldChange[]).filter((c) => !HIDE.has(c.field));
}
