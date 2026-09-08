import 'server-only';
import { sql } from '@/lib/db';
import { cache } from 'react';
import { PERMISSION_SETS, type Permission, type PermissionSet } from '@/lib/permission-sets';

export { PERMISSION_SETS };
export type { Permission, PermissionSet };

/**
 * Permissions come from the office someone currently holds, not from a flag on
 * their account. Rafid is not "an admin" — he is Treasurer this term, and that
 * is where his access comes from. When he resigns it stops, without anyone
 * editing his account or sending him a password.
 */

export type HeldOffice = {
  id: string;
  title: string;
  permission_set: PermissionSet;
  term_name: string | null;
  started_at: string;
};

/** Offices this member currently holds. Cached per request. */
export const heldOffices = cache(async (memberId: string): Promise<HeldOffice[]> => {
  return sql<HeldOffice[]>`
    select o.id, o.title, o.permission_set, o.started_at::text, t.name as term_name
    from officer_roles o
    left join terms t on t.id = o.term_id
    where o.member_id = ${memberId} and o.ended_at is null
    order by o.sort_order
  `;
});

/** Union of everything their offices grant. */
export const permissionsFor = cache(async (memberId: string): Promise<Permission[]> => {
  const offices = await heldOffices(memberId);
  const set = new Set<Permission>();
  for (const o of offices) {
    for (const p of PERMISSION_SETS[o.permission_set]?.grants ?? []) set.add(p);
  }
  return Array.from(set);
});

export async function can(memberId: string, permission: Permission): Promise<boolean> {
  return (await permissionsFor(memberId)).includes(permission);
}

/** Does this person have any reason to see the admin area at all? */
export async function hasAnyAdminAccess(memberId: string): Promise<boolean> {
  return (await permissionsFor(memberId)).length > 0;
}
