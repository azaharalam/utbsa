/**
 * Two addresses, one account.
 *
 * The university address stops working at graduation. Rather than switching
 * someone's login at that moment — an event that has to fire correctly or
 * lock them out — both addresses sign into the same account, forever.
 *
 * Shared between server and client, so nothing server-only here.
 */

export const UNIVERSITY_DOMAINS = ['utoledo.edu'];

export type JoiningAs = 'student' | 'alumni' | 'other';

export function isEmail(v: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());
}

export function isUniversityEmail(v: string) {
  const e = v.trim().toLowerCase();
  return isEmail(e) && UNIVERSITY_DOMAINS.some((d) => e.endsWith('@' + d) || e.endsWith('.' + d));
}

/** Students and alumni must prove they were here, and must stay reachable
 *  after they leave. Everyone else needs one working address. */
export function needsUniversityEmail(joiningAs: JoiningAs) {
  return joiningAs === 'student' || joiningAs === 'alumni';
}

/**
 * Which address we SEND to. Derived from member type rather than stored as a
 * choice, so it changes by itself the moment a student becomes an alum.
 */
export function contactEmail(m: {
  member_type: string; university_email: string | null; personal_email: string | null;
}): string | null {
  if (m.member_type === 'student') return m.university_email ?? m.personal_email;
  return m.personal_email ?? m.university_email;
}

export const MEMBER_TYPE_FOR: Record<JoiningAs, string> = {
  student: 'student',
  alumni: 'alumni',
  other: 'community',
};
