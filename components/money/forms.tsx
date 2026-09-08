'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui';

export function Submit({ label, variant = 'solid', full }: {
  label: string; variant?: 'solid' | 'ghost' | 'danger'; full?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} full={full} disabled={pending}>
      {pending ? 'Working…' : label}
    </Button>
  );
}

export function Money({ cents, bold }: { cents: number; bold?: boolean }) {
  const neg = cents < 0;
  const s = `${neg ? '-' : ''}$${(Math.abs(cents) / 100).toFixed(2)}`;
  return (
    <span className={`tabular-nums ${bold ? 'font-semibold' : ''} ${neg ? 'text-kantha' : ''}`}>
      {s}
    </span>
  );
}
