'use client';

import { useFormState } from 'react-dom';
import { setMessageHandled } from '@/app/actions/inbox';
import { Card, Pill, Notice } from '@/components/ui';
import type { Message } from '@/lib/queries/inbox';

export default function MessageRow({ message }: { message: Message }) {
  // Say why it was filtered, so a mistake is obvious at a glance.
  const filtered = message.spam_score >= 4;
  const [state, action] = useFormState(setMessageHandled, {});

  return (
    <Card className={message.handled ? 'opacity-70' : ''}>
      {state?.error && <Notice tone="error">{state?.error}</Notice>}

      {message.kind === 'appeal' && (
        <div className="mb-3 rounded-lg border-2 border-dashed border-genda bg-[#FDF8EC] p-2.5">
          <p className="text-sm font-semibold">
            A rejected applicant asking to be reconsidered
          </p>
          {filtered && message.spam_reasons && (
        <p className="mb-1 text-xs text-alta">Filtered — {message.spam_reasons}</p>
      )}
      <p className="text-xs text-ink-mid">
            Their account is still there. To let them in, set their status back to
            pending or active at{' '}
            <a href="/admin/members?status=rejected" className="font-semibold text-kantha">
              Members
            </a>.
          </p>
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-bold">
            {message.subject || 'No subject'}
          </p>
          <p className="text-xs text-ink-mid">
            {message.name} ·{' '}
            <a href={`mailto:${message.email}`} className="text-kantha hover:underline">
              {message.email}
            </a>
            {' · '}
            {new Date(message.created_at).toLocaleDateString('en-US',
              { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {message.handled ? (
          <div className="flex items-center gap-2">
            <Pill tone="green">
              done{message.handled_by_name ? ` — ${message.handled_by_name.split(' ')[0]}` : ''}
            </Pill>
            <form action={action}>
              <input type="hidden" name="id" value={message.id} />
              <input type="hidden" name="handled" value="0" />
              <button type="submit" className="text-xs text-ink-mid hover:text-alta">Reopen</button>
            </form>
          </div>
        ) : (
          <form action={action}>
            <input type="hidden" name="id" value={message.id} />
            <input type="hidden" name="handled" value="1" />
            <button type="submit"
              className="min-h-[36px] rounded-lg border-[1.5px] border-nil px-3 text-xs font-semibold text-nil">
              Mark done
            </button>
          </form>
        )}
      </div>

      <p className="whitespace-pre-line text-sm">{message.message}</p>

      <a href={`mailto:${message.email}?subject=${encodeURIComponent('Re: ' + (message.subject ?? 'UTBSA'))}`}
        className="mt-3 inline-block text-sm font-semibold text-kantha">
        Reply by email
      </a>
    </Card>
  );
}
