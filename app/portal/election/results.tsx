import { Card, Pill } from '@/components/ui';
import type { Result } from '@/lib/queries/elections';

export default function MemberResults({ results }: { results: Result[] }) {
  return (
    <div className="space-y-3">
      {results.map((r) => {
        const top = r.candidates[0];
        const tied = r.candidates.filter((c) => c.votes === top?.votes).length > 1;
        return (
          <Card key={r.position_id}>
            <h2 className="mb-2 font-display text-base font-bold">{r.position_title}</h2>
            <ul className="space-y-1.5">
              {r.candidates.map((c, i) => (
                <li key={c.nomination_id} className="flex items-center gap-3 text-sm">
                  <span className={i === 0 && !tied ? 'font-semibold' : ''}>{c.member_name}</span>
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
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
