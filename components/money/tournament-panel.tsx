'use client';

import { useRef } from 'react';
import { useFormState } from 'react-dom';
import { Button, Notice, Pill } from '@/components/ui';
import { registerToPlay, withdrawFromPlaying, bringGuest } from '@/app/actions/tournament';
import { ResetOnSuccess, Confirmation } from '@/components/money/form-result';
import type { Team, Player } from '@/lib/queries/tournament';

/**
 * What a member sees on a sporting event.
 *
 * Two separate things: register to PLAY (per person, closes early), and RSVP
 * as a spectator (per household, handled elsewhere on the page). A married
 * couple can both play, so this never touches households.
 *
 * The contribution shows only when signed in and only to students. It is
 * never rendered on the public page.
 */
export default function TournamentPanel({
  eventId, open, closedWhy, mine, teams, players, published,
  champion, runnerUp, contributionCents, costBreakdown, isStudent, signedIn,
}: {
  eventId: string;
  open: boolean;
  closedWhy?: string;
  mine: { id: string; team_id: string | null; note: string | null } | null;
  teams: Team[];
  players: Player[];
  published: boolean;
  champion: string | null;
  runnerUp: string | null;
  contributionCents: number;
  costBreakdown: string | null;
  isStudent: boolean;
  signedIn: boolean;
}) {
  const [regState, register] = useFormState(registerToPlay, {});
  const [outState, withdraw] = useFormState(withdrawFromPlaying, {});
  const [guestState, guest] = useFormState(bringGuest, {});

  const registerForm = useRef<HTMLFormElement>(null);
  const guestForm = useRef<HTMLFormElement>(null);

  const err = regState?.error ?? outState?.error ?? guestState?.error;
  const ok = regState?.ok ?? outState?.ok ?? guestState?.ok;
  const name = (p: Player) => p.member_name ?? `${p.guest_name} (guest)`;

  return (
    <div className="space-y-5">
      {/* ── the result, once there is one ───────────────────── */}
      {champion && (
        <div className="rounded-lg border-2 border-kantha bg-kantha-pale px-4 py-3">
          <p className="font-display text-lg font-bold">🏆 {champion}</p>
          {runnerUp && <p className="text-sm text-ink-mid">Runners-up: {runnerUp}</p>}
        </div>
      )}

      {/* ── the sides ───────────────────────────────────────── */}
      {published && teams.length > 0 && (
        <div>
          <h3 className="mb-2 font-display text-base font-bold">Teams</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {teams.map((t) => {
              const roster = players.filter((p) => p.team_id === t.id);
              return (
                <div key={t.id} className="rounded-lg border border-[#D6D1C2] p-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    {t.logo_url && (
                      <img src={t.logo_url} alt="" className="h-6 w-6 rounded object-cover" />
                    )}
                    <p className="font-semibold">{t.name}</p>
                    {champion === t.name && <Pill tone="green">champion</Pill>}
                  </div>
                  <ul className="text-sm text-ink-mid">
                    {roster.map((p) => <li key={p.id}>{name(p)}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── registering ─────────────────────────────────────── */}
      {signedIn && (
        <div className="rounded-lg border border-[#D6D1C2] p-4">
          <h3 className="mb-1 font-display text-base font-bold">Playing?</h3>

          {err && <Notice tone="error">{err}</Notice>}
          <Confirmation message={ok} />

          {mine ? (
            <>
              <p className="mb-3 text-sm text-ink-mid">
                You are down to play
                {mine.team_id && teams.find((t) => t.id === mine.team_id)
                  && <> for <strong>{teams.find((t) => t.id === mine.team_id)!.name}</strong></>}
                .
              </p>

              {isStudent && contributionCents > 0 && (
                <div className="mb-3 rounded-lg bg-muslin-deep px-3 py-2 text-sm">
                  <p>
                    We ask each playing student for{' '}
                    <strong>${(contributionCents / 100).toFixed(2)}</strong>.
                  </p>
                  {costBreakdown && (
                    <p className="mt-1 whitespace-pre-line text-xs text-ink-mid">
                      {costBreakdown}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-ink-mid">
                    If now is not a good time, tell an organiser — you still play.
                  </p>
                </div>
              )}

              {!mine.team_id && open && (
                <form action={withdraw}>
                  <input type="hidden" name="event_id" value={eventId} />
                  <Button type="submit" variant="ghost">Take me off</Button>
                </form>
              )}
              {mine.team_id && (
                <p className="text-xs text-ink-mid">
                  Teams are drawn up. If you cannot make it, call an organiser —
                  somebody has to rearrange the sides.
                </p>
              )}
            </>
          ) : open ? (
            <>
              <form ref={registerForm} action={register} className="mb-3">
                <ResetOnSuccess ok={regState?.ok} formRef={registerForm} />
                <input type="hidden" name="event_id" value={eventId} />
                <input name="note" placeholder="Anything we should know? (optional)"
                  className="mb-2 w-full rounded-lg border border-[#D6D1C2] px-3 py-2 text-sm" />
                <Button type="submit">Put me down to play</Button>
              </form>

              <form ref={guestForm} action={guest} className="flex items-end gap-2">
                <ResetOnSuccess ok={guestState?.ok} formRef={guestForm} />
                <input type="hidden" name="event_id" value={eventId} />
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold text-ink-mid">
                    Bringing a friend who is not a member?
                  </label>
                  <input name="guest_name" placeholder="Their name"
                    className="w-full rounded-lg border border-[#D6D1C2] px-3 py-2 text-sm" />
                </div>
                <Button type="submit" variant="ghost">Add</Button>
              </form>
            </>
          ) : (
            <p className="text-sm text-ink-mid">{closedWhy}</p>
          )}
        </div>
      )}
    </div>
  );
}
