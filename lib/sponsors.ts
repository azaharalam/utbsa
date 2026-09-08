/**
 * Sponsor tiers, by total given across all time.
 *
 * Tiers exist to give a business a reason to give more, and to let the
 * e-board thank people proportionately without having to decide case by case.
 *
 * Shared between server and client — nothing server-only here.
 */

export type Tier = {
  key: string; label: string; min_cents: number;
  description: string; accent: string;
};

export const TIERS: Tier[] = [
  { key: 'patron',    label: 'Patron',    min_cents: 100000,
    description: '$1,000 and above', accent: '#E4A32B' },
  { key: 'sustainer', label: 'Sustainer', min_cents: 50000,
    description: '$500 and above',   accent: '#1F6F55' },
  { key: 'supporter', label: 'Supporter', min_cents: 25000,
    description: '$250 and above',   accent: '#1E3050' },
  { key: 'friend',    label: 'Friend',    min_cents: 10000,
    description: '$100 and above',   accent: '#5B6270' },
  { key: 'contributor', label: 'Contributor', min_cents: 1,
    description: 'Any amount',       accent: '#B9C4B6' },
];

export function tierFor(totalCents: number): Tier {
  return TIERS.find((t) => totalCents >= t.min_cents) ?? TIERS[TIERS.length - 1];
}
