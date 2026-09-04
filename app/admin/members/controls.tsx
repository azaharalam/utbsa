'use client';

import { useFormState } from 'react-dom';
import { setMemberStatus, setMemberRole } from '@/app/actions/admin';

export default function MemberControls({
  id, status, role, isSelf,
}: {
  id: string; status: string; role: string; isSelf: boolean;
}) {
  const [statusState, statusAction] = useFormState(setMemberStatus, {});
  const [roleState, roleAction] = useFormState(setMemberRole, {});
  const err = statusState.error || roleState.error;

  const select = 'rounded-lg border border-[#D6D1C2] bg-white px-2 py-2 text-xs disabled:opacity-50';

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <form action={statusAction}>
          <input type="hidden" name="id" value={id} />
          <select
            name="status" defaultValue={status} disabled={isSelf}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            aria-label="Change status" className={select}
          >
            {['active', 'pending', 'inactive', 'alumni', 'rejected'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </form>

        <form action={roleAction}>
          <input type="hidden" name="id" value={id} />
          <select
            name="role" defaultValue={role}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            aria-label="Change role" className={select}
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
        </form>
      </div>
      {err && <p className="text-xs text-alta">{err}</p>}
    </div>
  );
}
