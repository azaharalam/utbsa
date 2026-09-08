import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requirePermission } from '@/lib/session';
import { getElection, positions, nominations, rollSize, results } from '@/lib/queries/elections';
import { listAll } from '@/lib/queries/members';
import { Card, Pill, Empty } from '@/components/ui';
import PositionManager from './positions';
import PhaseControl from './phase';
import NominationList from './nominations';
import Results from './results';

export const dynamic = 'force-dynamic';

export default async function ElectionDetail({ params }: { params: { id: string } }) {
  const me = await requirePermission('elections');
  const election = await getElection(params.id);
  if (!election) notFound();

  const [pos, noms, roll, tally, members] = await Promise.all([
    positions(election.id),
    nominations(election.id),
    rollSize(election.id),
    election.status === 'closed' ? results(election.id) : Promise.resolve([]),
    listAll(me, { status: 'active' }),
  ]);

  const isDraft = election.status === 'draft';
  const takingNoms = election.status === 'nominations';
  const reviewing = election.status === 'poll_ready';

  return (
    <>
      <Link href="/admin/elections" className="mb-4 inline-block text-sm text-kantha">
        ← All elections
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{election.name}</h1>
          <p className="text-sm text-ink-mid">Board for {election.session}</p>
        </div>
        {election.status === 'voting' && (
          <Card className="p-3">
            <p className="font-display text-xl font-bold text-nil">
              {roll.voted} / {roll.total}
            </p>
            <p className="text-xs text-ink-mid">have voted</p>
          </Card>
        )}
      </div>

      <PhaseControl election={election} positionCount={pos.length}
        approvedCount={noms.filter((n) => n.status === 'approved').length} />

      {election.status === 'closed' && <Results results={tally} electionId={election.id} />}

      <div className="mt-6 grid gap-5 lg:grid-cols-2 lg:items-start">
        <div>
          <h2 className="mb-1 font-display text-lg font-bold">Positions</h2>
          <p className="mb-3 text-sm text-ink-mid">
            {isDraft
              ? 'Add every position now. Once announced they cannot be changed.'
              : 'Frozen — this election was already announced.'}
          </p>
          <PositionManager electionId={election.id} positions={pos} editable={isDraft} />
        </div>

        <div>
          <h2 className="mb-1 font-display text-lg font-bold">
            Nominations {noms.length > 0 && <span className="text-ink-mid">({noms.length})</span>}
          </h2>
          <p className="mb-3 text-sm text-ink-mid">
            {takingNoms ? 'Members are submitting. You can also nominate someone yourself.'
             : reviewing ? 'Approve or decline each one, then open voting.'
             : 'Nominations are not open.'}
          </p>
          {noms.length || takingNoms ? (
            <NominationList
              electionId={election.id} nominations={noms} positions={pos}
              members={members.filter((m) => m.member_type === 'student')
                              .map((m) => ({ id: m.id, name: m.full_name }))}
              canAdd={takingNoms} canDecide={takingNoms || reviewing}
            />
          ) : (
            <Empty title="Nothing yet"
              body="Candidates appear here once nominations open." />
          )}
        </div>
      </div>
    </>
  );
}
