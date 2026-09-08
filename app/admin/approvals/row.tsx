'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { approveMember, rejectMember } from '@/app/actions/admin';
import { Card, Avatar, Button, Notice } from '@/components/ui';
import { useCloseOnSuccess } from '@/components/money/form-result';
import type { Member } from '@/lib/types';

function Label({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return <>{pending ? 'Working…' : children}</>;
}

export default function ApprovalRow({ member }: { member: Member }) {
  const [approveState, approve] = useFormState(approveMember, {});
  const [rejectState, reject] = useFormState(rejectMember, {});
  const [showReject, setShowReject] = useState(false);

  useCloseOnSuccess(rejectState.ok, () => setShowReject(false));

  const err = approveState.error || rejectState.error;

  return (
    <Card>
      {err && <Notice tone="error">{err}</Notice>}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Avatar name={member.full_name} />
          <div className="min-w-0">
            <p className="font-display text-base font-bold">{member.full_name}</p>
            <p className="truncate text-sm text-ink-mid">{member.email}</p>
            {member.phone && <p className="text-sm text-ink-mid">{member.phone}</p>}
            <p className="mt-1 text-xs text-ink-mid">
              {member.heard_from ? `Heard about us from: ${member.heard_from} · ` : ''}
              Applied {new Date(member.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
              {!member.email_verified_at && ' · email not confirmed'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <form action={approve}>
            <input type="hidden" name="id" value={member.id} />
            <Button type="submit"><Label>Approve</Label></Button>
          </form>
          <button
            onClick={() => setShowReject(!showReject)}
            className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil"
          >
            Reject
          </button>
        </div>
      </div>

      {showReject && (
        <form action={reject} className="mt-4 border-t-2 border-dashed border-stitch pt-4">
          <input type="hidden" name="id" value={member.id} />
          <label htmlFor={`r-${member.id}`} className="mb-1.5 block text-xs font-semibold text-ink-mid">
            Reason — stored on the record, and shown to them if they sign in
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={`r-${member.id}`} name="reason" placeholder="e.g. Duplicate account"
              className="flex-1 rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5"
            />
            <Button type="submit" variant="danger"><Label>Confirm rejection</Label></Button>
          </div>
        </form>
      )}
    </Card>
  );
}
