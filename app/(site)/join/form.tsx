'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import Link from 'next/link';
import { signUp } from '@/app/actions/auth';
import { Card, Field, Notice } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import { needsUniversityEmail, type JoiningAs } from '@/lib/emails';

const OPTIONS: { value: JoiningAs; label: string; hint: string }[] = [
  { value: 'student', label: 'A student at UToledo', hint: 'Undergraduate, master\u2019s, or PhD' },
  { value: 'alumni', label: 'A UToledo alum', hint: 'You studied here and have finished' },
  { value: 'other', label: 'Neither', hint: 'Spouse, family, faculty, or anyone in Toledo' },
];

export default function JoinForm() {
  const [state, action] = useFormState(signUp, {});
  const [joiningAs, setJoiningAs] = useState<JoiningAs>('student');
  const needsUni = needsUniversityEmail(joiningAs);

  return (
    <Card>
      {state?.error && <Notice tone="error">{state?.error}</Notice>}

      <form action={action}>
        <Field label="Full name" name="full_name" required placeholder="Rafid Hossain" />

        <fieldset className="mb-4">
          <legend className="mb-1.5 text-xs font-semibold text-ink-mid">You are</legend>
          <div className="space-y-2">
            {OPTIONS.map((o) => (
              <label key={o.value}
                className={`flex cursor-pointer gap-3 rounded-lg border-2 border-dashed p-3 ${
                  joiningAs === o.value ? 'border-kantha bg-kantha-pale' : 'border-stitch'}`}>
                <input type="radio" name="joining_as" value={o.value}
                  checked={joiningAs === o.value}
                  onChange={() => setJoiningAs(o.value)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#1F6F55]" />
                <span>
                  <span className="block text-sm font-semibold">{o.label}</span>
                  <span className="block text-xs text-ink-mid">{o.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {needsUni && (
          <Field
            label="UToledo email" name="university_email" type="email" required
            placeholder="you@rockets.utoledo.edu"
            hint={joiningAs === 'alumni'
              ? 'Even if it no longer works — it is how we confirm you studied here.'
              : 'Must end in utoledo.edu.'}
          />
        )}

        <Field
          label={needsUni ? 'Personal email' : 'Email'}
          name="personal_email" type="email" required
          placeholder="you@gmail.com"
          hint={needsUni
            ? 'Gmail, Outlook, anything that outlives your degree. Your UToledo address stops working when you leave, and this is how we stay in touch.'
            : 'The address you actually check.'}
        />

        <Field label="Phone" name="phone" type="tel" placeholder="+1 419 000 0000" />
        <Field label="How did you hear about us?" name="heard_from" placeholder="Optional" />

        <Submit label="Send my confirmation link" full />
      </form>

      {needsUni && (
        <p className="mt-4 text-xs text-ink-mid">
          Either address will sign you in, now and for good. Nothing has to change
          when you graduate.
        </p>
      )}

      <p className="mt-4 text-center text-sm text-ink-mid">
        Already a member? <Link href="/auth/login" className="font-semibold text-kantha">Sign in</Link>
      </p>
    </Card>
  );
}
