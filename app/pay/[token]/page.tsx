import { notFound } from 'next/navigation';
import { resolveClaimToken, myClaims } from '@/lib/queries/claims';
import { memberBalance } from '@/lib/queries/dues';
import { getSettings } from '@/lib/queries/settings';
import ClaimForm from '@/components/money/claim-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Send your contribution', robots: { index: false } };

/**
 * Reached from the link in a contribution email. This page is NOT a login.
 *
 * The token identifies the member and nothing more. There is no navigation
 * out of here, no directory, no profile — the only thing it can do is attach
 * a claim to this person's record, which a treasurer then has to confirm.
 */
export default async function PayPage({ params }: { params: { token: string } }) {
  const who = await resolveClaimToken(params.token);
  if (!who) notFound();

  const [balance, settings, claims] = await Promise.all([
    memberBalance(who.member_id),
    getSettings(),
    myClaims(who.member_id),
  ]);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-16">
      <p className="mb-1 flex items-baseline gap-2 font-display text-xl font-extrabold text-nil">
        UTBSA <span className="text-[13px] font-semibold text-kantha">ইউটিবিএসএ</span>
      </p>

      <ClaimForm
        firstName={who.full_name.split(' ')[0]}
        balanceCents={balance}
        settings={{
          method: settings.pay_method_label,
          name: settings.pay_to_name,
          handle: settings.pay_to_handle,
          instructions: settings.pay_instructions,
        }}
        recent={claims.slice(0, 3)}
        via="link"
      />
    </div>
  );
}
