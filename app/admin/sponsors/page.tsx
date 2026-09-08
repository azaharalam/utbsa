import { requirePermission } from '@/lib/session';
import { allSponsors } from '@/lib/queries/sponsors';
import { Empty } from '@/components/ui';
import SponsorRow from './row';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sponsors' };

export default async function AdminSponsors() {
  const me = await requirePermission('money');
  const sponsors = await allSponsors(me);

  const shown = sponsors.filter((s) => s.show_publicly);
  const askable = sponsors.filter(
    (s) => !s.show_publicly && !s.is_anonymous &&
           ['business', 'organization', 'university'].includes(s.type)
  );

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Sponsors</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-mid">
        Everyone who has given, and whether they appear on the public page. Nobody
        is listed unless they have agreed — ask before you switch anyone on.
        Tier is worked out from the total they have given.
      </p>

      {askable.length > 0 && (
        <div className="mb-6 rounded-xl border-2 border-dashed border-genda bg-[#FDF8EC] p-4">
          <p className="font-display text-base font-bold">
            {askable.length} business{askable.length === 1 ? '' : 'es'} or department
            {askable.length === 1 ? '' : 's'} not on the public page
          </p>
          <p className="text-sm text-ink-mid">
            Worth asking. Recognition is most of why a local business gives, and a
            named sponsor is far more likely to give again next year.
          </p>
        </div>
      )}

      {sponsors.length ? (
        <>
          {shown.length > 0 && (
            <>
              <h2 className="mb-2 font-display text-lg font-bold">On the public page</h2>
              <div className="mb-6 space-y-3">
                {shown.map((s) => <SponsorRow key={s.id} sponsor={s} />)}
              </div>
            </>
          )}

          <h2 className="mb-2 font-display text-lg font-bold">Not listed</h2>
          <div className="space-y-3">
            {sponsors.filter((s) => !s.show_publicly)
              .map((s) => <SponsorRow key={s.id} sponsor={s} />)}
          </div>
        </>
      ) : (
        <Empty title="No donors yet"
          body="Record a gift at /admin/donations and the donor appears here." />
      )}
    </>
  );
}
