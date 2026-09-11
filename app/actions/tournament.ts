'use server';

import { revalidatePath } from 'next/cache';
import { requireApproved, requireAdmin } from '@/lib/session';
import * as T from '@/lib/queries/tournament';
import { friendlyDbError } from '@/lib/errors';

type FormState = { error?: string; ok?: string };

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? '').trim();
  return v === '' ? null : v;
};

// ───────────────────────── members ─────────────────────────

export async function registerToPlay(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requireApproved();
  try {
    await T.register(me, String(fd.get('event_id')), str(fd, 'note'));
    revalidatePath('/events');
    revalidatePath('/portal');
    return { ok: 'You are down to play.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function withdrawFromPlaying(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requireApproved();
  try {
    await T.withdraw(me, String(fd.get('event_id')));
    revalidatePath('/events');
    return { ok: 'Taken off the list.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function bringGuest(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requireApproved();
  try {
    await T.addGuest(me, String(fd.get('event_id')), String(fd.get('guest_name') ?? ''));
    revalidatePath('/events');
    return { ok: 'Your guest is on the list.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

// ───────────────────────── organisers ─────────────────────────

export async function createTeam(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  try {
    await T.createTeam(me, String(fd.get('event_id')), {
      name: String(fd.get('name') ?? ''),
      logoUrl: str(fd, 'logo_url'),
    });
    revalidatePath('/admin/events');
    return { ok: 'Team added.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function renameTeam(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  try {
    await T.renameTeam(me, String(fd.get('team_id')),
      String(fd.get('name') ?? ''), str(fd, 'logo_url'));
    revalidatePath('/admin/events');
    return { ok: 'Saved.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function deleteTeam(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  try {
    await T.deleteTeam(me, String(fd.get('team_id')));
    revalidatePath('/admin/events');
    return { ok: 'Team removed. Its players are back in the pool.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function assignToTeam(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  try {
    const team = str(fd, 'team_id');
    await T.assignToTeam(me, String(fd.get('player_id')), team);
    revalidatePath('/admin/events');
    return { ok: team ? 'Moved.' : 'Back in the pool.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function addPlayer(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  try {
    await T.addPlayer(me, String(fd.get('event_id')), {
      memberId: str(fd, 'member_id'),
      guestName: str(fd, 'guest_name'),
    });
    revalidatePath('/admin/events');
    return { ok: 'Added.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function removePlayer(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  try {
    await T.removePlayer(me, String(fd.get('player_id')));
    revalidatePath('/admin/events');
    return { ok: 'Removed.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function publishTeams(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  try {
    const publish = fd.get('publish') === '1';
    await T.publishTeams(me, String(fd.get('event_id')), publish);
    revalidatePath('/admin/events');
    revalidatePath('/events');
    return { ok: publish ? 'Teams are public.' : 'Teams hidden again.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}

export async function recordResult(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  try {
    await T.recordResult(me, String(fd.get('event_id')), {
      championTeamId: str(fd, 'champion_team_id'),
      runnerUpTeamId: str(fd, 'runner_up_team_id'),
    });
    revalidatePath('/admin/events');
    revalidatePath('/events');
    return { ok: 'Result recorded.' };
  } catch (e) { return { error: friendlyDbError(e) }; }
}
