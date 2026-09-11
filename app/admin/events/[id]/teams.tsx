'use client';

import { useRef } from 'react';
import { useFormState } from 'react-dom';
import { Card, Button, Notice, Pill } from '@/components/ui';
import {
  createTeam, renameTeam, deleteTeam, assignToTeam,
  addPlayer, removePlayer, publishTeams, recordResult,
} from '@/app/actions/tournament';
import { ResetOnSuccess, Confirmation } from '@/components/money/form-result';
import type { Team, Player } from '@/lib/queries/tournament';

const cell = 'w-full rounded-lg border border-[#D6D1C2] bg-white px-2.5 py-2 text-sm';

/**
 * Teams and players for a sporting event.
 *
 * Deliberately plain: a pool of registered players, teams to drag them into,
 * and two dropdowns for the result. No fixtures, no scores, no standings — a
 * community tournament does not need a league table, and maintaining one on
 * the day is work nobody volunteered for.
 */
export default function Teams({
  eventId, teams, players, publishedAt, championId, runnerUpId,
  contributionCents, costBreakdown, members,
}: {
  eventId: string;
  teams: Team[];
  players: Player[];
  publishedAt: string | null;
  championId: string | null;
  runnerUpId: string | null;
  contributionCents: number;
  costBreakdown: string | null;
  members: { id: string; full_name: string }[];
}) {
  const [newState, create] = useFormState(createTeam, {});
  const [assignState, assign] = useFormState(assignToTeam, {});
  const [addState, add] = useFormState(addPlayer, {});
  const [pubState, publish] = useFormState(publishTeams, {});
  const [resState, result] = useFormState(recordResult, {});
  const [delState, remove] = useFormState(deleteTeam, {});
  const [rmState, rmPlayer] = useFormState(removePlayer, {});

  const newTeamForm = useRef<HTMLFormElement>(null);
  const addPlayerForm = useRef<HTMLFormElement>(null);

  const unassigned = players.filter((p) => !p.team_id);
  const students = players.filter((p) => p.is_student).length;

  const err = newState?.error ?? assignState?.error ?? addState?.error
    ?? pubState?.error ?? resState?.error ?? delState?.error ?? rmState?.error;

  const name = (p: Player) => p.member_name ?? `${p.guest_name} (guest)`;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Teams</h2>
          <p className="text-sm text-ink-mid">
            Everyone who registers plays. Put them on a side, then publish.
          </p>
        </div>
        <div className="flex gap-2">
          <Pill tone="grey">{players.length} players</Pill>
          {publishedAt
            ? <Pill tone="green">published</Pill>
            : <Pill tone="gold">not published</Pill>}
        </div>
      </div>

      {err && <Notice tone="error">{err}</Notice>}
      <Confirmation message={
        newState?.ok ?? assignState?.ok ?? addState?.ok
        ?? pubState?.ok ?? resState?.ok ?? delState?.ok ?? rmState?.ok
      } />

      {/* ── the money, never shown publicly ───────────────────── */}
      {contributionCents > 0 && (
        <div className="mb-5 rounded-lg border-2 border-dashed border-kantha bg-kantha-pale px-4 py-3">
          <p className="text-sm font-semibold">
            We ask each playing student for ${(contributionCents / 100).toFixed(2)}
            {' '}— {students} of {players.length} are students.
          </p>
          {costBreakdown && (
            <p className="mt-1 whitespace-pre-line text-xs text-ink-mid">{costBreakdown}</p>
          )}
          <p className="mt-1 text-xs text-ink-mid">
            Players and organisers see this. It never appears on the public page.
          </p>
        </div>
      )}

      {/* ── the sides ─────────────────────────────────────────── */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {teams.map((t) => {
          const roster = players.filter((p) => p.team_id === t.id);
          return (
            <div key={t.id} className="rounded-lg border border-[#D6D1C2] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <form action={renameTeam as any} className="flex flex-1 items-center gap-2">
                  <input type="hidden" name="team_id" value={t.id} />
                  <input name="name" defaultValue={t.name}
                    className={`${cell} font-semibold`} aria-label="Team name" />
                  <button type="submit" className="text-xs font-semibold text-kantha">
                    Save
                  </button>
                </form>
                <form action={remove}>
                  <input type="hidden" name="team_id" value={t.id} />
                  <button type="submit" className="text-xs text-clay">Delete</button>
                </form>
              </div>

              {roster.length === 0 ? (
                <p className="text-xs text-ink-mid">Nobody yet.</p>
              ) : (
                <ul className="space-y-1">
                  {roster.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        {name(p)}
                        {p.is_student && contributionCents > 0 && (
                          <span className="ml-1 text-xs text-ink-mid">· contributing</span>
                        )}
                      </span>
                      <form action={assign}>
                        <input type="hidden" name="player_id" value={p.id} />
                        <input type="hidden" name="team_id" value="" />
                        <button type="submit" className="text-xs text-ink-mid">remove</button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        <form ref={newTeamForm} action={create}
          className="rounded-lg border-2 border-dashed border-[#D6D1C2] p-3">
          <ResetOnSuccess ok={newState?.ok} formRef={newTeamForm} />
          <input type="hidden" name="event_id" value={eventId} />
          <label className="mb-1 block text-xs font-semibold text-ink-mid">New team</label>
          <input name="name" required placeholder="Dhaka Warriors" className={`${cell} mb-2`} />
          <input name="logo_url" placeholder="Logo URL (optional)" className={`${cell} mb-2`} />
          <Button type="submit">Add team</Button>
        </form>
      </div>

      {/* ── the pool ──────────────────────────────────────────── */}
      <h3 className="mb-2 font-display text-base font-bold">
        Not on a team yet ({unassigned.length})
      </h3>
      {unassigned.length === 0 ? (
        <p className="mb-4 text-sm text-ink-mid">Everyone has a side.</p>
      ) : (
        <ul className="mb-4 space-y-1">
          {unassigned.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-[10rem]">{name(p)}</span>
              {p.invited_by_name && (
                <span className="text-xs text-ink-mid">brought by {p.invited_by_name}</span>
              )}
              <form action={assign} className="flex items-center gap-1">
                <input type="hidden" name="player_id" value={p.id} />
                <select name="team_id" defaultValue="" className="rounded border border-[#D6D1C2] px-2 py-1 text-xs">
                  <option value="">Put on…</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button type="submit" className="text-xs font-semibold text-kantha">Go</button>
              </form>
              <form action={rmPlayer}>
                <input type="hidden" name="player_id" value={p.id} />
                <button type="submit" className="text-xs text-clay">drop</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form ref={addPlayerForm} action={add} className="mb-5 flex flex-wrap items-end gap-2">
        <ResetOnSuccess ok={addState?.ok} formRef={addPlayerForm} />
        <input type="hidden" name="event_id" value={eventId} />
        <div className="min-w-[200px]">
          <label className="mb-1 block text-xs font-semibold text-ink-mid">
            Add a member who asked in person
          </label>
          <select name="member_id" defaultValue="" className={cell}>
            <option value="">Choose…</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
        </div>
        <div className="min-w-[180px]">
          <label className="mb-1 block text-xs font-semibold text-ink-mid">or a guest</label>
          <input name="guest_name" placeholder="Name" className={cell} />
        </div>
        <Button type="submit" variant="ghost">Add</Button>
      </form>

      {/* ── publish, and the result ───────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 border-t border-[#EFE9DC] pt-4">
        <form action={publish}>
          <input type="hidden" name="event_id" value={eventId} />
          <input type="hidden" name="publish" value={publishedAt ? '0' : '1'} />
          <Button type="submit" variant={publishedAt ? 'ghost' : 'solid'}>
            {publishedAt ? 'Hide teams again' : 'Publish teams'}
          </Button>
        </form>

        {teams.length > 0 && (
          <form action={result} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="event_id" value={eventId} />
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-mid">Champion</label>
              <select name="champion_team_id" defaultValue={championId ?? ''} className={cell}>
                <option value="">—</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-mid">Runner-up</label>
              <select name="runner_up_team_id" defaultValue={runnerUpId ?? ''} className={cell}>
                <option value="">—</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <Button type="submit" variant="ghost">Record result</Button>
          </form>
        )}
      </div>
    </Card>
  );
}
