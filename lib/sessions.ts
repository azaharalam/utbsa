/**
 * The e-board serves an academic session — 2026-27 — not a semester.
 *
 * Dues are charged per semester and `terms` handles that. Offices and
 * elections use sessions, because a president does not stop being president
 * in December.
 *
 * Shared between server and client, so nothing server-only here.
 */

/** "2026-27" */
export function formatSession(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/** "2026-27" → 2026 */
export function sessionStartYear(session: string): number {
  return Number(session.split('-')[0]);
}

/** The session after this one. */
export function nextSession(session: string): string {
  return formatSession(sessionStartYear(session) + 1);
}

/** "2027-28 E-board Election" — an election is always for the next session. */
export function electionNameFor(session: string): string {
  return `${session} E-board Election`;
}

/**
 * Sessions run August to July, so anything before August still belongs to the
 * session that began the previous year.
 */
export function guessCurrentSession(now = new Date()): string {
  const y = now.getFullYear();
  return formatSession(now.getMonth() >= 7 ? y : y - 1);
}

/** Picker options: a couple back, a couple forward. */
export function sessionOptions(current: string): string[] {
  const start = sessionStartYear(current);
  return [start - 2, start - 1, start, start + 1, start + 2].map(formatSession);
}
