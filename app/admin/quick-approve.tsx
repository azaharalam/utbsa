'use client';

import { useFormState } from 'react-dom';
import { approveMember } from '@/app/actions/admin';
import { Avatar, Notice } from '@/components/ui';
import type { Member } from '@/lib/types';

/**
 * Approving a member is the most frequent thing an officer does, and the
 * thing people wait on. It should not take three clicks and a page load.
 */
export default function QuickApprove({ pending }: { pending: Member[] }) {
  const [state, approve] = useFormState(approveMember, {});
  if (!pending.length) return null;

  return (
    <div>
      {state?.error && <Notice tone="error">{state?.error}</Notice>}
      {state?.ok && <Notice tone="success">{state?.ok}</Notice>}

      <div className="space-y-2">
        {pending.slice(0, 3).map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3">
            <Avatar name={p.full_name} size={32} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{p.full_name}</p>
              <p className="truncate text-xs text-ink-mid">
                {p.email}
                {p.heard_from && ` · heard via ${p.heard_from}`}
              </p>
            </div>
            <form action={approve}>
              <input type="hidden" name="id" value={p.id} />
              <button type="submit"
                className="min-h-[36px] rounded-lg bg-kantha px-3 text-xs font-semibold text-white">
                Approve
              </button>
            </form>
          </div>
        ))}
      </div>

      {pending.length > 3 && (
        <a href="/admin/approvals" className="mt-3 inline-block text-xs font-semibold text-kantha">
          {pending.length - 3} more →
        </a>
      )}
    </div>
  );
}
