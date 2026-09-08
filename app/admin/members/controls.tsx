'use client';

import { useFormState } from 'react-dom';
import { setMemberStatus } from '@/app/actions/admin';

/**
 * Status only. There is deliberately no role dropdown here — admin rights
 * follow from the election result, not from someone toggling a menu.
 * Until Phase 3 lands, the first admin is created with
 *   npm run db:admin -- email@example.com
 */
export default function MemberControls({
  id, status, isSelf,
}: {
  id: string; status: string; isSelf: boolean;
}) {
  const [state, action] = useFormState(setMemberStatus, {} as { error?: string });

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <select
          name="status" defaultValue={status} disabled={isSelf}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          aria-label="Change status"
          className="rounded-lg border border-[#D6D1C2] bg-white px-2 py-2 text-xs disabled:opacity-50"
        >
          {['active', 'pending', 'inactive', 'alumni', 'rejected'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </form>
      {state.error && <p className="text-xs text-alta">{state.error}</p>}
    </div>
  );
}
