import 'server-only';
import { sql } from '@/lib/db';
import { tracked, trackedCreate, trackedDelete } from '@/lib/audit';
import { can } from '@/lib/permissions';
import type { Member } from '@/lib/types';

/**
 * Sporting events.
 *
 * Two kinds of attendee, and they are not the same shape:
 *
 *   SPECTATORS use `rsvps` — one per household, with adults and children.
 *   It is a headcount for food.
 *
 *   PLAYERS use `event_players` — strictly one row per person. Two spouses
 *   can both play, possibly on different teams, so the one-per-household
 *   rule that is right for a picnic is wrong here.
 *
 * Only the champion and runner-up are recorded. No fixtures, no scores, no
 * standings — a community tournament does not need a league table, and
 * maintaining one on the day is work nobody volunteered for.
 */

export type Team = {
  id: string; event_id: string; name: string;
  logo_url: string | null; sort_order: number;
};

export type Player = {
  id: string; event_id: string;
  member_id: string | null; member_name: string | null; photo_url: string | null;
  guest_name: string | null; invited_by: string | null; invited_by_name: string | null;
  team_id: string | null; note: string | null;
  registered_at: string; added_by: string | null;
  is_student: boolean;
};

async function assertEvents(actor: Member) {
  if (actor.status !== 'active' || !(await can(actor.id, 'events'))) {
    throw new Error('You do not have access to this.');
  }
}

// ───────────────────────── reading ─────────────────────────

export async function teamsFor(eventId: string): Promise<Team[]> {
  return sql<Team[]>`
    select * from teams where event_id = ${eventId}
    order by sort_order, created_at
  `;
}

export async function playersFor(eventId: string): Promise<Player[]> {
  return sql<Player[]>`
    select p.*,
           m.full_name  as member_name,
           m.photo_url,
           (m.member_type = 'student') as is_student,
           i.full_name  as invited_by_name
    from event_players p
    left join members m on m.id = p.member_id
    left join members i on i.id = p.invited_by
    where p.event_id = ${eventId}
    order by coalesce(m.full_name, p.guest_name)
  `;
}

/** Registration is open until the deadline, and only for a tournament. */
export function registrationOpen(ev: {
  is_tournament: boolean; player_reg_closes_at: string | null; cancelled_at: string | null;
}): { open: boolean; why?: string } {
  if (!ev.is_tournament) return { open: false, why: 'This is not a tournament.' };
  if (ev.cancelled_at) return { open: false, why: 'This event was cancelled.' };
  if (!ev.player_reg_closes_at) return { open: true };
  if (new Date(ev.player_reg_closes_at) < new Date()) {
    return { open: false, why: 'Registration has closed — the teams are being drawn up.' };
  }
  return { open: true };
}

export async function myRegistration(memberId: string, eventId: string) {
  const [row] = await sql<Player[]>`
    select p.*, t.name as team_name from event_players p
    left join teams t on t.id = p.team_id
    where p.event_id = ${eventId} and p.member_id = ${memberId}
  `;
  return row ?? null;
}

// ───────────────────────── registering ─────────────────────────

/** A member putting their own name down. Nobody else's. */
export async function register(member: Member, eventId: string, note?: string | null) {
  if (!['active', 'inactive', 'alumni'].includes(member.status)) {
    throw new Error('Only members can register.');
  }

  const [ev] = await sql<any[]>`
    select is_tournament, player_reg_closes_at, cancelled_at from events where id = ${eventId}
  `;
  if (!ev) throw new Error('That event no longer exists.');
  const state = registrationOpen(ev);
  if (!state.open) throw new Error(state.why!);

  await sql`
    insert into event_players (event_id, member_id, note)
    values (${eventId}, ${member.id}, ${note?.trim() || null})
    on conflict (event_id, member_id) where member_id is not null
    do update set note = ${note?.trim() || null}
  `;
}

export async function withdraw(member: Member, eventId: string) {
  const [row] = await sql<{ id: string; team_id: string | null }[]>`
    select id, team_id from event_players
    where event_id = ${eventId} and member_id = ${member.id}
  `;
  if (!row) throw new Error('You are not registered for this.');
  if (row.team_id) {
    throw new Error(
      'Teams have been drawn up and you are on one. Call an organiser — '
      + 'somebody has to rearrange the sides.'
    );
  }
  await sql`delete from event_players where id = ${row.id}`;
}

/** A member vouching for a friend who is not in UTBSA. */
export async function addGuest(member: Member, eventId: string, guestName: string) {
  if (!['active', 'inactive', 'alumni'].includes(member.status)) {
    throw new Error('Only members can bring a guest.');
  }
  const name = guestName.trim();
  if (!name) throw new Error('Give your guest a name.');

  const [ev] = await sql<any[]>`
    select is_tournament, player_reg_closes_at, cancelled_at from events where id = ${eventId}
  `;
  const state = registrationOpen(ev);
  if (!state.open) throw new Error(state.why!);

  await sql`
    insert into event_players (event_id, guest_name, invited_by)
    values (${eventId}, ${name}, ${member.id})
  `;
}

// ───────────────────────── organising ─────────────────────────

export async function createTeam(actor: Member, eventId: string, t: {
  name: string; logoUrl?: string | null;
}) {
  await assertEvents(actor);
  if (!t.name.trim()) throw new Error('Give the team a name.');

  const [{ n }] = await sql<{ n: string }[]>`
    select count(*)::text n from teams where event_id = ${eventId}
  `;
  const [row] = await sql<{ id: string }[]>`
    insert into teams (event_id, name, logo_url, sort_order)
    values (${eventId}, ${t.name.trim()}, ${t.logoUrl ?? null}, ${Number(n)})
    returning id
  `;
  await trackedCreate(actor.id, 'teams', row.id, 'team.create');
  return row.id;
}

export async function renameTeam(actor: Member, teamId: string, name: string, logoUrl?: string | null) {
  await assertEvents(actor);
  if (!name.trim()) throw new Error('Give the team a name.');
  await tracked(actor.id, 'teams', teamId, 'team.update', async () => {
    await sql`
      update teams set name = ${name.trim()},
                       logo_url = coalesce(${logoUrl ?? null}, logo_url)
      where id = ${teamId}
    `;
  });
}

export async function deleteTeam(actor: Member, teamId: string) {
  await assertEvents(actor);
  await trackedDelete(actor.id, 'teams', teamId, 'team.delete', async () => {
    // Players go back to the unassigned pool rather than disappearing.
    await sql`update event_players set team_id = null where team_id = ${teamId}`;
    await sql`delete from teams where id = ${teamId}`;
  });
}

/** Put a player on a side, or take them off one (teamId null). */
export async function assignToTeam(actor: Member, playerId: string, teamId: string | null) {
  await assertEvents(actor);
  await sql`update event_players set team_id = ${teamId} where id = ${playerId}`;
}

/** Somebody who asked in person rather than registering on the site. */
export async function addPlayer(actor: Member, eventId: string, p: {
  memberId?: string | null; guestName?: string | null;
}) {
  await assertEvents(actor);
  if (!p.memberId && !p.guestName?.trim()) throw new Error('Pick a member, or name a guest.');

  await sql`
    insert into event_players (event_id, member_id, guest_name, added_by)
    values (${eventId}, ${p.memberId ?? null}, ${p.guestName?.trim() ?? null}, ${actor.id})
    on conflict (event_id, member_id) where member_id is not null do nothing
  `;
}

export async function removePlayer(actor: Member, playerId: string) {
  await assertEvents(actor);
  await sql`delete from event_players where id = ${playerId}`;
}

export async function publishTeams(actor: Member, eventId: string, publish: boolean) {
  await assertEvents(actor);
  await tracked(actor.id, 'events', eventId, 'tournament.publish_teams', async () => {
    await sql`
      update events set teams_published_at = ${publish ? sql`now()` : null}
      where id = ${eventId}
    `;
  });
}

export async function recordResult(actor: Member, eventId: string, r: {
  championTeamId: string | null; runnerUpTeamId: string | null;
}) {
  await assertEvents(actor);
  if (r.championTeamId && r.championTeamId === r.runnerUpTeamId) {
    throw new Error('A team cannot be both champion and runner-up.');
  }
  await tracked(actor.id, 'events', eventId, 'tournament.result', async () => {
    await sql`
      update events set champion_team_id = ${r.championTeamId},
                        runner_up_team_id = ${r.runnerUpTeamId}
      where id = ${eventId}
    `;
  });
}

/**
 * What players are asked to contribute, and what it covers.
 *
 * Students only — everyone else plays as a guest of the association. And
 * never on the public page: this is for players and organisers.
 */
export async function contributionFor(eventId: string) {
  const [ev] = await sql<{
    player_contribution_cents: number; cost_breakdown: string | null;
  }[]>`
    select player_contribution_cents, cost_breakdown from events where id = ${eventId}
  `;
  return ev ?? { player_contribution_cents: 0, cost_breakdown: null };
}
