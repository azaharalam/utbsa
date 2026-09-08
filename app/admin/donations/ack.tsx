'use client';

import { useFormState } from 'react-dom';
import { acknowledgeDonation } from '@/app/actions/money';

export default function AckButton({ id }: { id: string }) {
  const [, action] = useFormState(acknowledgeDonation, {});
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit"
        className="min-h-[36px] rounded-lg border-[1.5px] border-nil px-3 text-xs font-semibold text-nil">
        Mark thanked
      </button>
    </form>
  );
}
