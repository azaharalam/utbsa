import 'server-only';
import { sql } from '@/lib/db';
import { cache } from 'react';
import type { Settings } from '@/lib/money';
import type { Member } from '@/lib/types';
import { tracked } from '@/lib/audit';
import { can } from '@/lib/permissions';

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await sql<Settings[]>`
    select current_session, dues_default_cents, org_email,
           pay_method_label, pay_to_name, pay_to_handle, pay_instructions
    from settings where id = 1
  `;
  return rows[0];
});

/**
 * Access comes from the office someone holds, never from a flag on their
 * account. The page guard already checked this, but a server action is a
 * public HTTP endpoint — it must never trust its caller.
 */
async function assertAdmin(actor: Member) {
  if (actor.status !== 'active' || !(await can(actor.id, 'roles'))) {
    throw new Error('You do not have access to this.');
  }
}

export async function updateSettings(actor: Member, s: Partial<Settings>) {
  await assertAdmin(actor);
  const before = (await sql`select * from settings where id = 1`)[0];
  await sql`
    update settings set
      current_session    = coalesce(${s.current_session ?? null}, current_session),
      dues_default_cents = coalesce(${s.dues_default_cents ?? null}, dues_default_cents),
      org_email          = coalesce(${s.org_email ?? null}, org_email),
      pay_method_label   = coalesce(${s.pay_method_label ?? null}, pay_method_label),
      pay_to_name        = coalesce(${s.pay_to_name ?? null}, pay_to_name),
      pay_to_handle      = coalesce(${s.pay_to_handle ?? null}, pay_to_handle),
      pay_instructions   = coalesce(${s.pay_instructions ?? null}, pay_instructions),
      updated_at = now()
    where id = 1
  `;
  const after = (await sql`select * from settings where id = 1`)[0];
  const { auditChange } = await import('@/lib/audit');
  await auditChange(actor.id, 'settings.update', {
    operation: 'update', entity: 'settings', before, after,
  });
}
