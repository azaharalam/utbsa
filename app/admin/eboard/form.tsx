'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { addOfficerAction } from './action';
import { Card, Field, Button, Notice } from '@/components/ui';

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" full disabled={pending}>{pending ? 'Adding…' : 'Add to the board'}</Button>;
}

const TITLES = [
  'President', 'Vice President', 'Treasurer', 'General Secretary',
  'Event Coordinator', 'Cultural Secretary', 'Webmaster', 'Advisor',
];

export default function OfficerForm({ members }: { members: { id: string; name: string }[] }) {
  const [state, action] = useFormState(addOfficerAction, {});

  return (
    <Card>
      <h2 className="mb-4 font-display text-lg font-bold">Add an officer</h2>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{state.ok}</Notice>}

      <form action={action}>
        <Field
          label="Member" name="member_id" as="select"
          options={members.map((m) => ({ value: m.id, label: m.name }))}
        />
        <Field
          label="Title" name="title" as="select"
          options={TITLES.map((t) => ({ value: t, label: t }))}
        />
        <Field
          label="Display order" name="sort_order" type="number" defaultValue="1"
          hint="Lower numbers appear first on the public page."
        />
        <Submit />
      </form>
    </Card>
  );
}
