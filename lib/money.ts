/**
 * Money is always integer cents, everywhere, in every layer.
 *
 * Floats produce off-by-a-penny errors that are miserable to trace back
 * through a ledger. If you ever find yourself writing `15.00`, stop.
 */

export function fmt(cents: number | null | undefined): string {
  const n = cents ?? 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

/** Parse a human-typed amount ("15", "$15.50", "15.5") into cents. */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '');
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

/** Stripe: 2.9% + 30c. Used to warn before a refund, and to log the cost. */
export function estimateFee(cents: number): number {
  return Math.round(cents * 0.029) + 30;
}

export type PaymentMethod = 'card' | 'cash' | 'zelle' | 'check' | 'fund' | 'other';
export type AdjustmentKind = 'waiver' | 'write_off' | 'credit' | 'correction';
export type DonorType =
  | 'individual' | 'alumni' | 'faculty' | 'university' | 'business' | 'organization';
export type EventType = 'cultural' | 'social' | 'orientation' | 'sporting';

export type Settings = {
  payments_enabled: boolean;
  fee_mode: 'absorb' | 'pass_through' | 'optional';
  dues_default_cents: number;
  org_email: string | null;
};

export type HouseholdBalance = {
  household_id: string;
  label: string | null;
  member_names: string;
  charged_cents: number;
  paid_cents: number;
  adjusted_cents: number;
  balance_cents: number;
};

export type DuesLine = {
  kind: 'charge' | 'payment' | 'adjustment';
  occurred_on: string;
  description: string;
  amount_cents: number;   // signed: + increases what you owe
};

export type Fund = {
  id: string; name: string; is_restricted: boolean;
  description: string | null; balance_cents: number;
};

export type Donor = {
  id: string; name: string; email: string | null; type: DonorType;
  member_id: string | null; is_anonymous: boolean; note: string | null;
  total_cents?: number;
};

export type Donation = {
  id: string; donor_id: string; donor_name: string; fund_id: string;
  fund_name: string; amount_cents: number; received_on: string;
  method: string; is_in_kind: boolean; in_kind_description: string | null;
  acknowledged_at: string | null; note: string | null;
};

export type LedgerEntry = {
  id: string; occurred_on: string; direction: 'in' | 'out';
  category: string; amount_cents: number; fund_name: string | null;
  note: string | null; source_type: string | null;
};

export type TicketOrder = {
  id: string; event_id: string; member_id: string | null;
  purchaser_name: string; purchaser_email: string | null;
  qty_adult: number; qty_child: number; amount_cents: number;
  status: string; method: string; created_at: string; refunded_at: string | null;
};

export type Rsvp = {
  id: string; event_id: string; member_id: string;
  member_name: string; guest_count: number; note: string | null;
  checked_in_at: string | null;
};

export type StatusRequest = {
  id: string; member_id: string; member_name: string; member_email: string;
  from_type: string; to_type: string; reason: string | null;
  requested_at: string; decision: string | null;
};
