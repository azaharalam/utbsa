'use client';

import { useMemo, useState } from 'react';
import { Card, Avatar, Empty } from '@/components/ui';
import type { DirectoryEntry } from '@/lib/types';

/**
 * Filtered in the browser as you type.
 *
 * The directory only contains members who opted in, and the query already
 * hides anything they chose not to share, so everything here is already safe
 * to show. Filtering locally means no wait between keystrokes.
 */
export default function DirectoryList({ members }: { members: DirectoryEntry[] }) {
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return members;
    const words = term.split(/\s+/);
    return members.filter((m) => {
      const hay = [
        m.full_name, m.department, m.student_level, m.hometown_bd,
        m.member_type, m.email,
      ].filter(Boolean).join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [q, members]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, department, or district"
          aria-label="Search the directory"
          className="w-full flex-1 rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 placeholder:text-[#A7A497] focus:border-kantha focus:outline-none focus:ring-2 focus:ring-kantha/25 sm:w-auto"
        />
        {q && (
          <button type="button" onClick={() => setQ('')}
            className="text-sm font-semibold text-ink-mid hover:text-ink">
            Clear
          </button>
        )}
      </div>

      {shown.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m) => (
            <Card key={m.id} className="text-center">
              <div className="mb-3 flex justify-center">
                <Avatar name={m.full_name} url={m.photo_url} />
              </div>
              <p className="font-display text-base font-bold">{m.full_name}</p>
              <p className="text-xs text-ink-mid">
                {[m.department, m.student_level].filter(Boolean).join(' · ') ||
                  (m.member_type === 'spouse' ? 'Spouse member' : m.member_type)}
              </p>
              {m.hometown_bd && (
                <p className="mt-1 text-xs font-medium text-kantha">{m.hometown_bd}</p>
              )}
              {m.arrival_semester && m.arrival_year && (
                <p className="text-xs capitalize text-ink-mid">
                  Since {m.arrival_semester} {m.arrival_year}
                </p>
              )}
              {m.email && (
                <a href={`mailto:${m.email}`}
                  className="mt-2 block truncate text-xs text-ink-mid hover:text-kantha">
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
          body={q
            ? 'Try a shorter search — a first name, or a district.'
            : 'Members appear here once they opt in from their profile page.'}
        />
      )}
    </>
  );
}
