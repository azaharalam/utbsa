import { requireApproved } from '@/lib/session';
import { directory } from '@/lib/queries/members';
import { Card, Avatar, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Directory' };

export default async function Directory({ searchParams }: { searchParams: { q?: string } }) {
  const me = await requireApproved();
  const q = (searchParams.q ?? '').trim();
  const members = await directory(me, q);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Member directory</h1>
      <p className="mb-5 text-sm text-ink-mid">
        {members.length} {members.length === 1 ? 'member has' : 'members have'} chosen to be listed.
      </p>

      <form className="mb-6">
        <input
          name="q" defaultValue={q}
          placeholder="Search by name, department, or district"
          className="w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 placeholder:text-[#A7A497] focus:border-kantha focus:outline-none focus:ring-2 focus:ring-kantha/25"
        />
      </form>

      {members.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <Card key={m.id} className="text-center">
              <div className="mb-3 flex justify-center">
                <Avatar name={m.full_name} url={m.photo_url} />
              </div>
              <p className="font-display text-base font-bold">{m.full_name}</p>
              <p className="text-xs text-ink-mid">
                {[m.department, m.student_level].filter(Boolean).join(' · ') ||
                  (m.member_type === 'spouse' ? 'Spouse member' : m.member_type)}
              </p>
              {m.hometown_bd && <p className="mt-1 text-xs font-medium text-kantha">{m.hometown_bd}</p>}
              {m.arrival_semester && m.arrival_year && (
                <p className="text-xs capitalize text-ink-mid">
                  Since {m.arrival_semester} {m.arrival_year}
                </p>
              )}
              {m.email && (
                <a href={`mailto:${m.email}`} className="mt-2 block truncate text-xs text-ink-mid hover:text-kantha">
                  {m.email}
                </a>
              )}
              {m.phone && <p className="text-xs text-ink-mid">{m.phone}</p>}
            </Card>
          ))}
        </div>
      ) : (
        <Empty
          title={q ? 'Nobody matched that' : 'The directory is empty'}
          body={q ? 'Try a shorter search — a first name or a district.' : 'Members appear here once they opt in from their profile page.'}
        />
      )}
    </>
  );
}
