/**
 * Scoring for the public contact form.
 *
 * The honeypot catches crude bots. It does not catch the SEO pitch, because
 * that is either sent by a person or by something that parses the form
 * properly and leaves hidden fields alone.
 *
 * So: score it, and QUARANTINE rather than delete. Filing a real message in a
 * second list that somebody reads next week is a small cost. Deleting one is
 * not, and a member who writes to the e-board and hears nothing does not
 * write again.
 */

type Signal = { points: number; why: string };

/** Phrases that do not appear in a message from somebody who needs help. */
const PITCH = [
  /\bSEO\b/i,
  /search engine optimi[sz]/i,
  /\bbacklinks?\b/i,
  /google (ranking|visibility|first page)/i,
  /\b(higher|quality) leads\b/i,
  /\borganic (growth|traffic)\b/i,
  /increase (your )?(traffic|sales|revenue|ranking)/i,
  /\b(web|app|software) development services\b/i,
  /\bdigital marketing\b/i,
  /I (was )?(came across|looking over|noticed|stumbled upon) your (website|site)/i,
  /would you be (open|interested) (to|in)/i,
  /\b(proposal|quote|pricing) (attached|ready|prepared)\b/i,
  /\bno obligation\b/i,
  /\bguarantee(d)? (results|ranking|traffic)/i,
  /\bcrypto|\bforex\b|\bbinary option/i,
];

const URL_RE = /https?:\/\/|www\.[a-z0-9-]+\.[a-z]{2,}/gi;

export function scoreMessage(m: {
  name: string; email: string; subject: string | null; message: string;
}): { score: number; reasons: string[] } {
  const signals: Signal[] = [];
  const body = `${m.subject ?? ''}\n${m.message}`;

  const hits = PITCH.filter((re) => re.test(body));
  if (hits.length) {
    signals.push({ points: hits.length >= 2 ? 5 : 3, why: `${hits.length} sales phrases` });
  }

  const links = body.match(URL_RE)?.length ?? 0;
  if (links >= 3) signals.push({ points: 3, why: `${links} links` });
  else if (links >= 1) signals.push({ points: 1, why: 'contains a link' });

  // A real first message to a student association rarely runs long and
  // formal. A pitch usually does.
  if (m.message.length > 900) signals.push({ points: 1, why: 'unusually long' });

  // "Best regards, Jack." with no surname, from a numbered gmail.
  if (/^[a-z]+\d{4,}@/i.test(m.email)) {
    signals.push({ points: 2, why: 'name-plus-digits address' });
  }

  // Nobody writing to UTBSA calls it "your business" or "your company".
  if (/\byour (business|company|brand|agency)\b/i.test(body)) {
    signals.push({ points: 2, why: 'addresses us as a business' });
  }

  // A name that is one word with no Bengali or Latin surname is weak on its
  // own, so it only counts alongside something else.
  if (signals.length && /^[A-Z][a-z]+\.?$/.test(m.name.trim())) {
    signals.push({ points: 1, why: 'single-word name' });
  }

  return {
    score: signals.reduce((s, x) => s + x.points, 0),
    reasons: signals.map((s) => s.why),
  };
}

/** At or above this, it does not appear in the main list. */
export const SPAM_THRESHOLD = 4;

/**
 * A form submitted within a couple of seconds of loading was not typed by a
 * person. The timestamp is signed so it cannot simply be back-dated.
 */
export function formTooFast(openedAt: number | null, minMs = 2500): boolean {
  if (!openedAt) return false;          // missing is not proof of anything
  return Date.now() - openedAt < minMs;
}
