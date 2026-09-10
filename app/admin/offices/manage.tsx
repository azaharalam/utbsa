'use client';

import { useRef } from 'react';

import { useFormState } from 'react-dom';
import { assignOffice, endOffice } from '@/app/actions/elections';
import { Card, Notice, Field } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import { ResetOnSuccess, Confirmation } from '@/components/money/form-result';
import { PERMISSION_SETS } from '@/lib/permission-sets';

export default function OfficeAdmin({
  offices, members, session,
}: {
  offices: { id: string; title: string; holder: string }[];
  members: { id: string; name: string }[];
  session: string;
}) {
  const [assignState, assign] = useFormState(assignOffice, {});
  const [endState, end] = useFormState(endOffice, {});

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <Card>
        <h2 className="mb-1 font-display text-lg font-bold">Give someone an office</h2>
        <p className="mb-4 text-sm text-ink-mid">
          For the {session} board only — filling a vacancy, or appointing a faculty
          advisor. Next year&apos;s board comes from an election, and past boards
          are history. One office per person.
        </p>

        {assignState?.error && <Notice tone="error">{assignState?.error}</Notice>}
        <Confirmation message={assignState?.ok} />

        <form action={assign}>
          <Field label="Member" name="member_id" as="select"
            options={members.map((m) => ({ value: m.id, label: m.name }))} />
          <Field label="Title" name="title" required placeholder="Treasurer" />
          <Field label="What they can do" name="permission_set" as="select"
            options={Object.entries(PERMISSION_SETS).map(([k, v]) => ({
              value: k, label: `${v.label} — ${v.description}`,
            }))} />
          <Submit label="Assign" full />
        </form>
      </Card>

      <Card>
        <h2 className="mb-1 font-display text-lg font-bold">End an office</h2>
        <p className="mb-4 text-sm text-ink-mid">
          Leaves the position vacant. Their account and history are untouched — only
          the access stops.
        </p>

        {endState?.error && <Notice tone="error">{endState?.error}</Notice>}
        <Confirmation message={endState?.ok} />

        <form action={end}>
          <Field label="Office" name="id" as="select"
            options={offices.map((o) => ({ value: o.id, label: `${o.title} — ${o.holder}` }))} />
          <Field label="Reason" name="reason" placeholder="Term ended, stepped down, graduated" />
          <Submit label="End it" variant="ghost" />
        </form>
      </Card>
    </div>
  );
}
