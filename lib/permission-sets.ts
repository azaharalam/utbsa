/**
 * Shared by server and client, so this file must stay free of any server-only
 * import. The database side lives in lib/permissions.ts.
 */

export type Permission =
  | 'members'    // approve, deactivate, view contact details
  | 'money'      // dues, transfers, donations, funds, ledger
  | 'content'    // posts and pages
  | 'events'     // create and manage events
  | 'elections'  // run an election
  | 'roles';     // assign offices and permissions

export type PermissionSet = 'full' | 'money' | 'members' | 'content' | 'events' | 'none';

export const PERMISSION_SETS: Record<PermissionSet, {
  label: string; description: string; grants: Permission[];
}> = {
  full: {
    label: 'Full access',
    description: 'Everything, including assigning offices. President and General Secretary.',
    grants: ['members', 'money', 'content', 'events', 'elections', 'roles'],
  },
  money: {
    label: 'Money',
    description: 'Dues, transfers, donations, funds, and the ledger. Cannot approve members.',
    grants: ['money'],
  },
  members: {
    label: 'Members and content',
    description: 'Approvals, member records, posts, and events. No access to money.',
    grants: ['members', 'content', 'events'],
  },
  content: {
    label: 'Content',
    description: 'Posts and events. Never sees anyone\u2019s balance. Media Officer.',
    grants: ['content', 'events'],
  },
  events: {
    label: 'Events only',
    description: 'Create and manage events, nothing else.',
    grants: ['events'],
  },
  none: {
    label: 'No admin access',
    description: 'Listed on the public e-board page, but no extra access to the site.',
    grants: [],
  },
};
