'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { sendMessage } from '@/app/actions/contact';
import { Card, Field, Button, Notice } from '@/components/ui';
import { Done } from '@/components/money/form-result';

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" full disabled={pending}>{pending ? 'Sending…' : 'Send message'}</Button>;
}

export default function ContactForm() {
  const [state, action] = useFormState(sendMessage, {});

  // Nothing follows a sent message, so the form has no reason to stay.
  if (state?.ok) {
    return (
      <Done title="Message sent">
        <p className="text-sm text-ink-mid">
          Somebody on the e-board will read it and reply by email. Usually within a day or two.
        </p>
      </Done>
    );
  }

  return (
    <Card>
      {state?.error && <Notice tone="error">{state?.error}</Notice>}
      {state?.ok && <Notice tone="success">{state?.ok}</Notice>}
      <form action={action}>
        <Field label="Your name" name="name" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Subject" name="subject" placeholder="Optional" />
        <Field label="Message" name="message" as="textarea" rows={5} required />
        {/* Honeypot — hidden from people, irresistible to bots. */}
        <input
          type="text" name="website" tabIndex={-1} autoComplete="off"
          aria-hidden="true" className="absolute -left-[9999px] h-0 w-0"
        />
        <Submit />
      </form>
    </Card>
  );
}
