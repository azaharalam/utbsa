import { requirePermission } from '@/lib/session';
import { listAll, statusCounts } from '@/lib/queries/members';
import { Card, Pill, Avatar, Empty } from '@/components/ui';
import { currentOffices } from '@/lib/queries/offices';
import MemberControls from './controls';
import ExportButton from './export';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Members' };

const LEVELS: Record<string, string> = {
  undergrad: 'Undergraduate', masters: "Master's", phd: 'PhD', na: '',
};

const TYPES: Record<string, string> = {
  student: 'Student', spouse: 'Spouse', faculty: 'Faculty',
  alumni: 'Alum', community: 'Community',
};

/** "Student · PhD in Chemical Engineering · Joined Fall 2025" */
function describe(m: {
  member_type: string; student_level: string | null; department: string | null;
  arrival_semester: string | null; arrival_year: number | null; created_at: string;
}) {
  const bits: string[] = [TYPES[m.member_type] ?? m.member_type];

  const level = m.student_level ? LEVELS[m.student_level] : '';
  if (level && m.department) bits.push(`${level} in ${m.department}`);
  else if (level) bits.push(level);
  else if (m.department) bits.push(m.department);

  if (m.arrival_semester && m.arrival_year) {
    const s = m.arrival_semester[0].toUpperCase() + m.arrival_semester.slice(1);
    bits.push(`Joined ${s} ${m.arrival_year}`);
  } else {
    bits.push('Joined ' + new Date(m.created_at).toLocaleDateString('en-US',
      { month: 'short', year: 'numeric' }));
  }

  return bits.join(' · ');
}

const tones: Record<string, string> = {
  active: 'green', pending: 'gold', rejected: 'red', inactive: 'grey', alumni: 'grey',
};

export default async function Members({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  const me = await requirePermission('members');
  const status = searchParams.status ?? '';
  const q = searchParams.q ?? '';

  const [members, counts, offices] = await Promise.all([
    listAll(me, { status: status || undefined, q }),
    statusCounts(me),
    currentOffices(),
  ]);
  const officeOf = new Map(offices.map((o) => [o.member_id, o.title]));

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Members</h1>
        <ExportButton members={members} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <a href="/admin/members"><Pill tone={status ? 'grey' : 'green'}>All {total}</Pill></a>
        {['active', 'pending', 'inactive', 'alumni', 'rejected'].map((s) => (
          <a key={s} href={`/admin/members?status=${s}`}>
            <Pill tone={status === s ? 'green' : 'grey'}>
              {s[0].toUpperCase() + s.slice(1)} {counts[s] ?? 0}
            </Pill>
          </a>
        ))}
      </div>

      <form className="mb-5">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          name="q" defaultValue={q} placeholder="Search name, email, or department"
          className="w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 sm:max-w-sm"
        />
      </form>

      {members.length ? (
        <div className="space-y-3">
          {members.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={m.full_name} url={m.photo_url} size={40} />
                  <div className="min-w-0">
                    <p className="truncate font-display text-[15px] font-bold">
                      {m.full_name}
                      {officeOf.has(m.id) && (
                        <span className="ml-2 text-xs font-semibold text-genda">
                          ({officeOf.get(m.id)})
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-ink-mid">
                      {m.email}
                      {m.show_phone && m.phone ? ` | ${m.phone}` : ''}
                    </p>
                    {m.university_email && m.personal_email && (
                      <p className="truncate text-xs text-ink-mid">
                        also {m.email === m.university_email ? m.personal_email : m.university_email}
                      </p>
                    )}
                    <p className="text-xs text-ink-mid">
                      {describe(m)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Pill tone={tones[m.status]}>{m.status}</Pill>
                  <MemberControls id={m.id} status={m.status} isSelf={m.id === me.id} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Empty title="No members match" body="Try clearing the filter or shortening the search." />
      )}
    </>
  );
}
