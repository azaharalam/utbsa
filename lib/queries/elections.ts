import 'server-only';
import { sql } from '@/lib/db';
import { audit, tracked, trackedCreate, trackedDelete } from '@/lib/audit';
import { can } from '@/lib/permissions';
import type { Member } from '@/lib/types';
import type { PermissionSet } from '@/lib/permissions';
import { nextSession, electionNameFor } from '@/lib/sessions';

async function assertElections(actor: Member) {
  if (!(await can(actor.id, 'elections'))) throw new Error('You cannot run elections.');
}
async function assertRoles(actor: Member) {
  if (!(await can(actor.id, 'roles'))) throw new Error('You cannot assign offices.');
}

export type ElectionStatus =
  'draft' | 'announced' | 'nominations' | 'poll_ready' | 'voting' | 'closed';

export type Election = {
  id: string; name: string; status: ElectionStatus;
  session: string;
  nominations_open_on: string | null; nominations_close_on: string | null;
  voting_open_on: string | null; voting_close_on: string | null;
  created_at: string; closed_at: string | null;
};

export type ElectionPosition = {
  id: string; election_id: string; title: string;
  permission_set: PermissionSet; description: string | null; sort_order: number;
};

export type Nomination = {
  id: string; election_id: string; position_id: string; position_title: string;
  member_id: string; member_name: string; member_email: string;
  statement: string | null; status: string; decline_reason: string | null;
  created_by: string | null; created_at: string;
};

// ───────────────────────── reading ─────────────────────────

export async function listElections(): Promise<Election[]> {
  return sql<Election[]>`select * from elections order by created_at desc`;
}

export async function getElection(id: string): Promise<Election | null> {
  const rows = await sql<Election[]>`select * from elections where id = ${id}`;
  return rows[0] ?? null;
}

/** The one members see on their dashboard, if any. */
export async function activeElection(): Promise<Election | null> {
  const rows = await sql<Election[]>`
    select * from elections
    where status in ('announced','nominations','poll_ready','voting')
    order by created_at desc limit 1
  `;
  return rows[0] ?? null;
}

export async function positions(electionId: string): Promise<ElectionPosition[]> {
  return sql<ElectionPosition[]>`
    select * from election_positions where election_id = ${electionId}
    order by sort_order, title
  `;
}

export async function nominations(
  electionId: string, status?: string
): Promise<Nomination[]> {
  return sql<Nomination[]>`
    select n.*, p.title as position_title,
           m.full_name as member_name, m.email as member_email
    from nominations n
    join election_positions p on p.id = n.position_id
    join members m on m.id = n.member_id
    where n.election_id = ${electionId}
      and (${!status} or n.status = ${status ?? ''})
    order by p.sort_order, m.full_name
  `;
}

// ───────────────────────── eligibility ─────────────────────────

/**
 * Everyone votes — dues are irrelevant. Only active members, but a spouse,
 * a faculty member, and an alum all count the same as a student.
 */
export async function canVote(memberId: string, electionId: string) {
  const [row] = await sql<{ ok: boolean; voted: boolean }[]>`
    select
      exists(select 1 from election_voters
             where election_id = ${electionId} and member_id = ${memberId}) as ok,
      exists(select 1 from election_voters
             where election_id = ${electionId} and member_id = ${memberId}
               and voted_at is not null) as voted
  `;
  return row;
}

/**
 * Standing for office is stricter than voting: active students only, and only
 * with nothing outstanding. Holding office means handling the organisation's
 * money, which is a different bar from turning up to vote.
 */
export async function canStand(memberId: string): Promise<{ ok: boolean; why?: string }> {
  const [m] = await sql<any[]>`
    select status, member_type,
      (coalesce((select sum(amount_cents) from dues_charges where member_id = ${memberId}), 0)
       - coalesce((select sum(amount_cents) from payments    where member_id = ${memberId}), 0)
       - coalesce((select sum(amount_cents) from adjustments where member_id = ${memberId}), 0)
      )::int as balance
    from members where id = ${memberId}
  `;
  if (!m) return { ok: false, why: 'Not a member.' };
  if (m.status !== 'active') return { ok: false, why: 'Your membership is not active.' };
  if (m.member_type !== 'student') return { ok: false, why: 'Only students can stand for office.' };
  if (m.balance > 0) {
    return { ok: false, why:
      `Officers are expected to have contributed for the semester. `
      + `Yours has not come through yet — send it and this will clear.` };
  }
  return { ok: true };
}

// ───────────────────────── running an election ─────────────────────────

/**
 * There is only ever one kind of election: the e-board for the next session.
 * The name and session are derived, not typed — nobody can create an election
 * for a session that already had one, or misname it.
 */
export async function createElection(
  actor: Member,
  e: { nominationsOpen?: string | null; nominationsClose?: string | null;
       votingOpen?: string | null; votingClose?: string | null }
) {
  await assertElections(actor);

  const [settings] = await sql<{ current_session: string }[]>`
    select current_session from settings where id = 1
  `;
  const session = nextSession(settings.current_session);

  const [existing] = await sql<{ id: string; status: string }[]>`
    select id, status from elections where session = ${session}
  `;
  if (existing) {
    throw new Error(`An election for ${session} already exists.`);
  }

  const [row] = await sql<{ id: string }[]>`
    insert into elections (name, session, nominations_open_on, nominations_close_on,
                           voting_open_on, voting_close_on, created_by)
    values (${electionNameFor(session)}, ${session},
            ${e.nominationsOpen ?? null}, ${e.nominationsClose ?? null},
            ${e.votingOpen ?? null}, ${e.votingClose ?? null}, ${actor.id})
    returning id
  `;
  await trackedCreate(actor.id, 'elections', row.id, 'election.create');
  return row.id;
}

export async function addPosition(
  actor: Member,
  p: { electionId: string; title: string; permissionSet: PermissionSet;
       description?: string | null; sortOrder?: number }
) {
  await assertElections(actor);

  const e = await getElection(p.electionId);
  if (!e) throw new Error('Unknown election.');
  // Positions are frozen at announcement so nominations and ballots cannot
  // shift underneath the people already in them.
  if (e.status !== 'draft') {
    throw new Error('Positions can only be changed while the election is a draft.');
  }

  const [row] = await sql<{ id: string }[]>`
    insert into election_positions (election_id, title, permission_set, description, sort_order)
    values (${p.electionId}, ${p.title.trim()}, ${p.permissionSet},
            ${p.description ?? null}, ${p.sortOrder ?? 0})
    returning id
  `;
  await trackedCreate(actor.id, 'election_positions', row.id, 'election.add_position');
  return row.id;
}

export async function removePosition(actor: Member, positionId: string) {
  await assertElections(actor);
  const [pos] = await sql<any[]>`
    select p.*, e.status from election_positions p
    join elections e on e.id = p.election_id where p.id = ${positionId}
  `;
  if (!pos) throw new Error('Unknown position.');
  if (pos.status !== 'draft') throw new Error('Positions are frozen once announced.');

  await trackedDelete(actor.id, 'election_positions', positionId,
    'election.remove_position', async () => {
      await sql`delete from election_positions where id = ${positionId}`;
    });
}

const NEXT: Record<ElectionStatus, ElectionStatus | null> = {
  draft: 'announced', announced: 'nominations', nominations: 'poll_ready',
  poll_ready: 'voting', voting: 'closed', closed: null,
};

/**
 * Move to the next phase.
 *
 *   draft → announced → nominations → poll_ready → voting → closed
 *
 * poll_ready is the gap where the admin reviews nominations and confirms the
 * ballot. Without it, nominations closing and voting opening are the same
 * instant and nothing can be checked.
 */
export async function advance(actor: Member, electionId: string) {
  await assertElections(actor);

  const e = await getElection(electionId);
  if (!e) throw new Error('Unknown election.');

  const next = NEXT[e.status];
  if (!next) throw new Error('This election is already closed.');

  if (next === 'announced') {
    const pos = await positions(electionId);
    if (!pos.length) throw new Error('Add at least one position before announcing.');
  }

  if (next === 'voting') {
    const approved = await nominations(electionId, 'approved');
    if (!approved.length) throw new Error('No approved candidates. Nothing to vote on.');
    await snapshotRoll(electionId);
  }

  const stamps: Record<string, string> = {
    announced: 'announced_at', nominations: 'nominations_at',
    poll_ready: 'poll_ready_at', voting: 'voting_at', closed: 'closed_at',
  };
  const stampColumn = stamps[next];

  await tracked(actor.id, 'elections', electionId, `election.${next}`, async () => {
    await sql`
      update elections set status = ${next},
        ${sql(stampColumn)} = now()
      where id = ${electionId}
    `;
  });

  return next;
}

/**
 * Freeze the electorate.
 *
 * Computed live, someone paying dues or joining mid-vote would change who is
 * eligible after ballots already exist. The snapshot is also what lets a
 * losing candidate be shown exactly who could vote, and when that was fixed,
 * without seeing a single ballot.
 */
async function snapshotRoll(electionId: string) {
  await sql`
    insert into election_voters (election_id, member_id)
    select ${electionId}, id from members where status = 'active'
    on conflict do nothing
  `;
}

export async function rollSize(electionId: string) {
  const [row] = await sql<{ total: string; voted: string }[]>`
    select count(*)::text as total,
           count(voted_at)::text as voted
    from election_voters where election_id = ${electionId}
  `;
  return { total: Number(row.total), voted: Number(row.voted) };
}

// ───────────────────────── nominations ─────────────────────────

export async function nominate(n: {
  electionId: string; positionId: string; memberId: string;
  statement?: string | null; createdBy?: string | null;
}) {
  const e = await getElection(n.electionId);
  if (!e) throw new Error('Unknown election.');
  if (e.status !== 'nominations') throw new Error('Nominations are not open.');

  const eligible = await canStand(n.memberId);
  if (!eligible.ok) throw new Error(eligible.why!);

  const [dupe] = await sql<{ id: string }[]>`
    select id from nominations
    where election_id = ${n.electionId} and member_id = ${n.memberId}
      and status <> 'withdrawn'
  `;
  if (dupe) throw new Error('That person already has a nomination in this election.');

  const [row] = await sql<{ id: string }[]>`
    insert into nominations (election_id, position_id, member_id, statement, created_by)
    values (${n.electionId}, ${n.positionId}, ${n.memberId},
            ${n.statement ?? null}, ${n.createdBy ?? null})
    returning id
  `;
  return row.id;
}

export async function decideNomination(
  actor: Member, nominationId: string,
  decision: 'approved' | 'declined', reason?: string | null
) {
  await assertElections(actor);
  if (decision === 'declined' && !reason?.trim()) {
    throw new Error('Give a reason — the candidate sees it.');
  }

  const [row] = await sql<{ election_id: string }[]>`
    update nominations
    set status = ${decision}, decline_reason = ${reason?.trim() ?? null},
        reviewed_by = ${actor.id}, reviewed_at = now()
    where id = ${nominationId} and status = 'pending'
    returning election_id
  `;
  if (!row) throw new Error('That nomination has already been reviewed.');

  await tracked(actor.id, 'nominations', nominationId, `nomination.${decision}`,
    async () => {}, { reason: reason?.trim() ?? null });
}

export async function withdrawNomination(memberId: string, nominationId: string) {
  const [row] = await sql<{ id: string }[]>`
    update nominations set status = 'withdrawn'
    where id = ${nominationId} and member_id = ${memberId}
      and status in ('pending','approved')
    returning id
  `;
  if (!row) throw new Error('That nomination cannot be withdrawn.');
}

// ───────────────────────── voting ─────────────────────────

/**
 * Cast a ballot.
 *
 * The single most important function in this file. Two writes happen in one
 * transaction:
 *
 *   · election_voters.voted_at is stamped   — records THAT they voted
 *   · a ballot and its choices are inserted — records WHAT was voted
 *
 * They share a transaction but no foreign key, no timestamp precise enough to
 * correlate, and no ordering guarantee. There is no query that connects a
 * member to a choice, and there must never be one.
 */
export async function castBallot(
  memberId: string, electionId: string,
  choices: { positionId: string; nominationId: string | null }[]
) {
  const e = await getElection(electionId);
  if (!e) throw new Error('Unknown election.');
  if (e.status !== 'voting') throw new Error('Voting is not open.');

  const status = await canVote(memberId, electionId);
  if (!status.ok) throw new Error('You are not on the roll for this election.');
  if (status.voted) throw new Error('You have already voted.');

  await sql.begin(async (tx) => {
    // Claim the vote first. If two tabs submit at once, only one updates a
    // row and the other finds nothing, so no second ballot is written.
    const claimed = await tx<{ member_id: string }[]>`
      update election_voters set voted_at = now()
      where election_id = ${electionId} and member_id = ${memberId}
        and voted_at is null
      returning member_id
    `;
    if (!claimed.length) throw new Error('You have already voted.');

    const [ballot] = await tx<{ id: string }[]>`
      insert into ballots (election_id) values (${electionId}) returning id
    `;

    for (const c of choices) {
      await tx`
        insert into ballot_choices (ballot_id, position_id, nomination_id)
        values (${ballot.id}, ${c.positionId}, ${c.nominationId})
      `;
    }
  });

  // Deliberately NOT audited. The log records nothing about voting, because
  // an audit trail that links a member to a ballot is a back door through
  // the secrecy this whole design exists to protect.
}

export type Result = {
  position_id: string; position_title: string; sort_order: number;
  candidates: { nomination_id: string; member_id: string; member_name: string; votes: number }[];
  abstentions: number;
};

export async function results(electionId: string): Promise<Result[]> {
  const pos = await positions(electionId);

  const tally = await sql<any[]>`
    select bc.position_id, bc.nomination_id,
           n.member_id, m.full_name as member_name,
           count(*)::int as votes
    from ballot_choices bc
    join ballots b on b.id = bc.ballot_id
    left join nominations n on n.id = bc.nomination_id
    left join members m on m.id = n.member_id
    where b.election_id = ${electionId}
    group by bc.position_id, bc.nomination_id, n.member_id, m.full_name
  `;

  return pos.map((p) => {
    const rows = tally.filter((t) => t.position_id === p.id);
    return {
      position_id: p.id,
      position_title: p.title,
      sort_order: p.sort_order,
      candidates: rows
        .filter((r) => r.nomination_id)
        .map((r) => ({
          nomination_id: r.nomination_id, member_id: r.member_id,
          member_name: r.member_name, votes: r.votes,
        }))
        .sort((a, b) => b.votes - a.votes),
      abstentions: rows.find((r) => !r.nomination_id)?.votes ?? 0,
    };
  });
}
