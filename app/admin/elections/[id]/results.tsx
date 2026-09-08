'use client';

import { Card, Pill } from '@/components/ui';
import type { Result } from '@/lib/queries/elections';

export default function Results({ results, electionId }: {
  results: Result[]; electionId: string;
}) {
  return (
    <div className="mt-6">
      <h2 className="mb-1 font-display text-lg font-bold">Results</h2>
      <p className="mb-3 text-sm text-ink-mid">
        Counted from the ballots. There is no record anywhere of who voted for whom —
        only that they voted.
      </p>

      <div className="space-y-3">
        {results.map((r) => {
          const top = r.candidates[0];
          const tied = r.candidates.filter((c) => c.votes === top?.votes).length > 1;

          return (
            <Card key={r.position_id}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="font-display text-base font-bold">{r.position_title}</h3>
                {tied && <Pill tone="red">tied — needs a human decision</Pill>}
              </div>

              <ul className="space-y-1.5">
                {r.candidates.map((c, i) => (
                  <li key={c.nomination_id} className="flex items-center gap-3 text-sm">
                    <span className={i === 0 && !tied ? 'font-semibold' : ''}>
                      {c.member_name}
                    </span>
                    {i === 0 && !tied && <Pill tone="green">elected</Pill>}
                    <span className="ml-auto tabular-nums">{c.votes}</span>
                  </li>
                ))}
                {r.abstentions > 0 && (
                  <li className="flex items-center gap-3 text-sm text-ink-mid">
                    <span>Abstained</span>
                    <span className="ml-auto tabular-nums">{r.abstentions}</span>
                  </li>
                )}
                {!r.candidates.length && (
                  <li className="text-sm text-ink-mid">Nobody stood for this position.</li>
                )}
              </ul>
            </Card>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-ink-mid">
        Handover happens at <a href="/admin/offices" className="font-semibold text-kantha">Offices</a> —
        each current holder resigns and the office passes to whoever won it.
      </p>
    </div>
  );
}
