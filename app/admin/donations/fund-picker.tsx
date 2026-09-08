'use client';

import { useFormState } from 'react-dom';
import { reassignDonationFund } from '@/app/actions/money';

/** Gifts land in General. This moves one into a restricted fund. */
export default function FundPicker({
  donationId, current, funds,
}: {
  donationId: string; current: string;
  funds: { id: string; name: string }[];
}) {
  const [, action] = useFormState(reassignDonationFund, {});

  return (
    <form action={action}>
      <input type="hidden" name="id" value={donationId} />
      <select
        name="fund_id" defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label="Which fund"
        className="rounded-lg border border-[#D6D1C2] bg-white px-2 py-1.5 text-xs"
      >
        {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
    </form>
  );
}
