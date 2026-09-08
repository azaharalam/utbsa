import { requireApproved } from '@/lib/session';
import {
  activeElection, positions, nominations, canVote, canStand, rollSize, results, listElections,
} from '@/lib/queries/elections';
import { Card, Empty, Pill } from '@/components/ui';
import NominateBox from './nominate';
import BallotBox from './ballot';
import MemberResults from './results';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Election' };

export default async function PortalElection() {
  const me = await requireApproved();
  const election = await activeElection();

  if (!election) {
    const all = await listElections();
    const lastClosed = all.find((e) => e.status === 'closed');
    if (lastClosed) {
      const [pos, tally] = await Promise.all([
        positions(lastClosed.id), results(lastClosed.id),
      ]);
      return (
        <>
          <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">{lastClosed.name}</h1>
          <p className="mb-5 text-sm text-ink-mid">This election has finished.</p>
          <MemberResults results={tally} />
        </>
      );
    }
    return (
      <>
        <h1 className="mb-5 font-display text-2xl font-bold sm:text-3xl">Election</h1>
        <Empty title="No election running"
          body="When the e-board announces one, it appears here and you will get an email." />
      </>
    );
  }

  const [pos, noms, eligible, roll] = await Promise.all([
    positions(election.id),
    nominations(election.id, 'approved'),
    canStand(me.id),
    rollSize(election.id),
  ]);

  const myNom = (await nominations(election.id)).find((n) => n.member_id === me.id);
  const voteStatus = election.status === 'voting'
    ? await canVote(me.id, election.id)
    : { ok: false, voted: false };

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">{election.name}</h1>
      <p className="mb-5 text-sm text-ink-mid">
        {election.status === 'announced' && 'Announced. Nominations open soon.'}
        {election.status === 'nominations' && 'Nominations are open.'}
        {election.status === 'poll_ready' && 'Nominations have closed. Voting opens shortly.'}
        {election.status === 'voting' && `Voting is open — ${roll.voted} of ${roll.total} members have voted.`}
      </p>

      {election.status === 'voting' && (
        voteStatus.voted ? (
          <Card className="mb-5 border-kantha bg-kantha-pale">
            <p className="font-display text-base font-bold">Your vote is in</p>
            <p className="text-sm text-ink-mid">
              Thank you. Nobody — including the e-board — can see how you voted.
              Results appear here when voting closes.
            </p>
          </Card>
        ) : voteStatus.ok ? (
          <BallotBox electionId={election.id} positions={pos} nominations={noms} />
        ) : (
          <Card className="mb-5">
            <p className="text-sm text-ink-mid">
              You are not on the roll for this election. The roll was fixed when voting
              opened; if you think that is wrong, contact the e-board.
            </p>
          </Card>
        )
      )}

      {election.status === 'nominations' && (
        <NominateBox
          electionId={election.id} positions={pos}
          eligible={eligible} existing={myNom ?? null}
        />
      )}

      {(election.status === 'poll_ready' || election.status === 'voting') && noms.length > 0 && (
        <>
          <h2 className="mb-3 mt-6 font-display text-lg font-bold">Who is standing</h2>
          <div className="space-y-2">
            {pos.map((p) => {
              const forThis = noms.filter((n) => n.position_id === p.id);
              return (
                <Card key={p.id} className="p-4">
                  <p className="mb-1 font-display text-sm font-bold">{p.title}</p>
                  {forThis.length ? (
                    <ul className="space-y-1">
                      {forThis.map((n) => (
                        <li key={n.id} className="text-sm">
                          {n.member_name}
                          {n.statement && (
                            <span className="text-ink-mid"> — {n.statement}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-mid">Nobody is standing.</p>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
