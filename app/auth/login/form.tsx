'use client';

import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn } from '@/app/actions/auth';
import { Card, Field, Button, Notice } from '@/components/ui';

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" full disabled={pending}>{pending ? 'Sending…' : 'Email me a sign-in link'}</Button>;
}

export default function LoginForm() {
  const [state, action] = useFormState(signIn, {});
  return (
    <Card>
      <h1 className="mb-1 font-display text-2xl font-bold">Sign in</h1>
      <p className="mb-5 text-sm text-ink-mid">No password. We send a link that signs you in for 30 days.</p>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <form action={action}>
        <Field label="Email" name="email" type="email" required placeholder="you@rockets.utoledo.edu" />
        <Submit />
      </form>
      <p className="mt-4 text-center text-sm text-ink-mid">
        Not a member yet? <Link href="/join" className="font-semibold text-kantha">Join UTBSA</Link>
      </p>
    </Card>
  );
}
