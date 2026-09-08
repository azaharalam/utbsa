'use server';

import { revalidatePath } from 'next/cache';
import { requireApproved, requirePermission } from '@/lib/session';
import * as El from '@/lib/queries/elections';
import * as Off from '@/lib/queries/offices';
import type { PermissionSet } from '@/lib/permissions';

export type FormState = { error?: string; ok?: string };

const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const n = (fd: FormData, k: string) => s(fd, k) || null;

// ───────────────────────── running an election ─────────────────────────

export async function createElection(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('elections');
    // Name and session are derived — there is only one kind of election.
    await El.createElection(me, {
      nominationsOpen: n(fd, 'nominations_open_on'),
      nominationsClose: n(fd, 'nominations_close_on'),
      votingOpen: n(fd, 'voting_open_on'),
      votingClose: n(fd, 'voting_close_on'),
    });
    revalidatePath('/admin/elections');
    return { ok: 'Created as a draft. Add the positions, then announce it.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function addPosition(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('elections');
    if (!s(fd, 'title')) return { error: 'Give the position a title.' };
    await El.addPosition(me, {
      electionId: s(fd, 'election_id'),
      title: s(fd, 'title'),
      permissionSet: (s(fd, 'permission_set') || 'none') as PermissionSet,
      description: n(fd, 'description'),
      sortOrder: Number(fd.get('sort_order') ?? 0),
    });
    revalidatePath(`/admin/elections/${s(fd, 'election_id')}`);
    return { ok: 'Position added.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function removePosition(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('elections');
    await El.removePosition(me, s(fd, 'id'));
    revalidatePath(`/admin/elections/${s(fd, 'election_id')}`);
    return { ok: 'Removed.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function advanceElection(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('elections');
    const next = await El.advance(me, s(fd, 'id'));
    revalidatePath(`/admin/elections/${s(fd, 'id')}`);
    revalidatePath('/admin/elections');
    revalidatePath('/portal');
    const msg: Record<string, string> = {
      announced: 'Announced. Positions are now frozen.',
      nominations: 'Nominations are open.',
      poll_ready: 'Nominations closed. Review the candidates, then open voting.',
      voting: 'Voting is open and the roll is frozen.',
      closed: 'Voting closed. Results are visible to members.',
    };
    return { ok: msg[next] ?? 'Moved on.' };
  } catch (e) { return { error: (e as Error).message }; }
}

// ───────────────────────── nominations ─────────────────────────

/** A member putting themselves forward. */
export async function selfNominate(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await El.nominate({
      electionId: s(fd, 'election_id'),
      positionId: s(fd, 'position_id'),
      memberId: me.id,
      statement: n(fd, 'statement'),
      createdBy: null,           // null means they nominated themselves
    });
    revalidatePath('/portal/election');
    return { ok: 'Submitted. An admin will confirm it.' };
  } catch (e) { return { error: (e as Error).message }; }
}

/** An admin nominating someone else. Recorded as such, so it is never
 *  mistaken for a self-nomination. */
export async function nominateMember(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('elections');
    await El.nominate({
      electionId: s(fd, 'election_id'),
      positionId: s(fd, 'position_id'),
      memberId: s(fd, 'member_id'),
      statement: n(fd, 'statement'),
      createdBy: me.id,
    });
    revalidatePath(`/admin/elections/${s(fd, 'election_id')}`);
    return { ok: 'Nomination created on their behalf.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function decideNomination(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('elections');
    await El.decideNomination(me, s(fd, 'id'),
      s(fd, 'decision') as 'approved' | 'declined', n(fd, 'reason'));
    revalidatePath(`/admin/elections/${s(fd, 'election_id')}`);
    return { ok: 'Done.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function withdrawNomination(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await El.withdrawNomination(me.id, s(fd, 'id'));
    revalidatePath('/portal/election');
    return { ok: 'Withdrawn.' };
  } catch (e) { return { error: (e as Error).message }; }
}

// ───────────────────────── voting ─────────────────────────

export async function castBallot(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    const electionId = s(fd, 'election_id');

    const positions = await El.positions(electionId);
    const choices = positions.map((p) => {
      const raw = String(fd.get(`position_${p.id}`) ?? '');
      return { positionId: p.id, nominationId: raw === 'abstain' || !raw ? null : raw };
    });

    await El.castBallot(me.id, electionId, choices);

    revalidatePath('/portal/election');
    return { ok: 'Your vote is in. Thank you.' };
  } catch (e) { return { error: (e as Error).message }; }
}

// ───────────────────────── offices ─────────────────────────

export async function assignOffice(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('roles');
    await Off.assignOffice(me, {
      memberId: s(fd, 'member_id'),
      title: s(fd, 'title'),
      permissionSet: (s(fd, 'permission_set') || 'none') as PermissionSet,
    });
    revalidatePath('/admin/offices');
    revalidatePath('/eboard');
    return { ok: 'Office assigned. They keep their own account.' };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function endOffice(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requirePermission('roles');
    await Off.endOffice(me, s(fd, 'id'), s(fd, 'reason') || 'Term ended');
    revalidatePath('/admin/offices');
    revalidatePath('/eboard');
    return { ok: 'Office ended.' };
  } catch (e) { return { error: (e as Error).message }; }
}

/** Resign and hand over in one step. No password changes hands. */
export async function resignTo(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireApproved();
    await Off.resignTo(me, {
      officeId: s(fd, 'office_id'),
      successorMemberId: s(fd, 'successor_id'),
      electionId: n(fd, 'election_id'),
    });
    revalidatePath('/admin/offices');
    revalidatePath('/portal');
    revalidatePath('/eboard');
    return { ok: 'Handed over. Both of you have been emailed.' };
  } catch (e) { return { error: (e as Error).message }; }
}
