'use client';

import { useFormState } from 'react-dom';
import { decideStatusRequest } from '@/app/actions/money';
import { Card, Avatar, Notice } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import type { StatusRequest } from '@/lib/money';

export default function RequestRow({ req }: { req: StatusRequest }) {
  const [state, action] = useFormState(decideStatusRequest, {});

  return (
    <Card>
      {state?.error && <Notice tone="error">{state?.error}</Notice>}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Avatar name={req.member_name} />
          <div className="min-w-0">
            <p className="font-display text-base font-bold">{req.member_name}</p>
            <p className="truncate text-sm text-ink-mid">{req.member_email}</p>
            <p className="mt-1 text-sm">
              <span className="capitalize">{req.from_type}</span>
              {' → '}
              <span className="font-semibold capitalize text-kantha">{req.to_type}</span>
            </p>
            {req.reason && <p className="mt-1 text-xs text-ink-mid">{req.reason}</p>}
            <p className="mt-1 text-xs text-ink-mid">
              Asked {new Date(req.requested_at).toLocaleDateString('en-US',
                { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <form action={action}>
            <input type="hidden" name="id" value={req.id} />
            <input type="hidden" name="decision" value="approved" />
            <Submit label="Approve" />
          </form>
          <form action={action}>
            <input type="hidden" name="id" value={req.id} />
            <input type="hidden" name="decision" value="declined" />
            <Submit label="Decline" variant="ghost" />
          </form>
        </div>
      </div>
    </Card>
  );
}
