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
 * Which address we SEND to.
 *
 * Personal, for everybody — including students.
 *
 * We used to write to a student's @rockets.utoledo.edu address while it still
 * worked. It does not work in practice: the university quarantines mail from
 * a domain it has not seen before, and the message never reaches the inbox.
 * The member sees nothing, reports nothing, and concludes the site is broken.
 * On a site where the sign-in link IS the password, that is fatal.
 *
 * The personal address also outlives the degree, which is why we require one.
 *
 * The university address still signs them in — see findByEmail. This governs
 * where we write, not who can get in.
 */
export function contactEmail(m: {
  member_type: string; university_email: string | null; personal_email: string | null;
}): string | null {
  return m.personal_email ?? m.university_email;
}

export const MEMBER_TYPE_FOR: Record<JoiningAs, string> = {
  student: 'student',
  alumni: 'alumni',
  other: 'community',
};
