'use client';

import { useMemo, useState } from 'react';
import { Card, Pill, Avatar, Empty } from '@/components/ui';
import MemberControls from './controls';
import AddMember from './add';
import type { Member } from '@/lib/types';

/**
 * The member list, filtered as you type.
 *
 * Filtering happens here rather than on the server. The page already has every
 * member in memory, so there is nothing to wait for — no request per keystroke,
 * no debounce, and it keeps working on a phone with a slow connection.
 *
 * At a few hundred members this is free. If UTBSA ever has several thousand,
 * this becomes a server query again.
 */

const LEVELS: Record<string, string> = {
  undergrad: 'Undergraduate', masters: "Master's", phd: 'PhD', na: '',
};

const TYPES: Record<string, string> = {
  student: 'Student', spouse: 'Spouse', faculty: 'Faculty',
  alumni: 'Alum', community: 'Community',
};

const tones: Record<string, string> = {
  active: 'green', pending: 'gold', rejected: 'red', inactive: 'grey', alumni: 'grey',
};

/** "Student · PhD in Chemical Engineering · Joined Fall 2025" */
function describe(m: Member) {
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

export default function MemberList({
  members, offices, meId,
}: {
  members: Member[];
  offices: [string, string][];
  meId: string;
}) {
  const [q, setQ] = useState('');
  const officeOf = useMemo(() => new Map(offices), [offices]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return members;

    // Every word has to match somewhere. "rahman chem" finds Tanvir Rahman in
    // Chemical Engineering, which is how people actually search.
    const words = term.split(/\s+/);
    return members.filter((m) => {
      const hay = [
        m.full_name, m.email, m.university_email, m.personal_email,
        m.department, m.hometown_bd, m.phone,
        TYPES[m.member_type] ?? m.member_type,
        officeOf.get(m.id),
      ].filter(Boolean).join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [q, members, officeOf]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, department, office…"
          aria-label="Search members"
          className="w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 sm:max-w-sm"
        />
        {q && (
          <button type="button" onClick={() => setQ('')}
            className="text-sm font-semibold text-ink-mid hover:text-ink">
            Clear
          </button>
        )}
      </div>

      {q && (
        <p className="mb-4 text-sm text-ink-mid">
          {shown.length === 0
            ? <>Nothing matches <strong>{q}</strong>.</>
            : <>{shown.length} of {members.length} {members.length === 1 ? 'person' : 'people'}.</>}
        </p>
      )}

      <AddMember />

      {shown.length ? (
        <div className="space-y-3">
          {shown.map((m) => (
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
                    <p className="truncate text-xs text-ink-mid">{m.email}</p>
                    <p className="text-xs text-ink-mid">{describe(m)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Pill tone={tones[m.status]}>{m.status}</Pill>
                  <MemberControls id={m.id} status={m.status} isSelf={m.id === meId} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : q ? (
        <Empty title="Nobody matches"
          body="Try fewer words, or part of a name rather than all of it." />
      ) : (
        <Empty title="No members yet"
          body="People appear here once they join and are approved." />
      )}
    </>
  );
}
