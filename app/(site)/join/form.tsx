'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { signUp } from '@/app/actions/auth';
import { Card, Field, Button, Notice } from '@/components/ui';
import Link from 'next/link';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" full disabled={pending}>
      {pending ? 'Sending…' : 'Send my confirmation link'}
    </Button>
  );
}

export default function JoinForm() {
  const [state, action] = useFormState(signUp, {});

  return (
    <Card>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <form action={action}>
        <Field label="Full name" name="full_name" required placeholder="Rafid Hossain" />
        <Field
          label="Email" name="email" type="email" required
          placeholder="you@rockets.utoledo.edu"
          hint="Use whichever address you actually check."
        />
        <Field label="Phone" name="phone" type="tel" placeholder="+1 419 000 0000" />
        <Field label="How did you hear about us?" name="heard_from" placeholder="Optional" />
        <Submit />
      </form>
      <p className="mt-4 text-center text-sm text-ink-mid">
        Already a member? <Link href="/auth/login" className="font-semibold text-kantha">Sign in</Link>
      </p>
    </Card>
  );
}
