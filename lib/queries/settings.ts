import 'server-only';
import { sql } from '@/lib/db';
import { cache } from 'react';
import type { Settings } from '@/lib/money';
import type { Member } from '@/lib/types';
import { audit } from '@/lib/audit';

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await sql<Settings[]>`
    select payments_enabled, fee_mode, dues_default_cents, org_email
    from settings where id = 1
  `;
  return rows[0];
});

function assertAdmin(actor: Member) {
  if (actor.role !== 'admin' || actor.status !== 'active') throw new Error('Admins only.');
}

export async function updateSettings(actor: Member, s: Partial<Settings>) {
  assertAdmin(actor);
  await sql`
    update settings set
      payments_enabled   = coalesce(${s.payments_enabled ?? null}, payments_enabled),
      fee_mode           = coalesce(${s.fee_mode ?? null}, fee_mode),
      dues_default_cents = coalesce(${s.dues_default_cents ?? null}, dues_default_cents),
      org_email          = coalesce(${s.org_email ?? null}, org_email),
      updated_at = now()
    where id = 1
  `;
  await audit(actor.id, 'settings.update', 'settings', undefined, s as any);
}
