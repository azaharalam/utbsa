/**
 * A raw constraint violation tells the person nothing they can act on.
 * "new row for relation \"donors\" violates check constraint" is a message
 * for whoever wrote the code, not whoever is filling in the form.
 */
export function friendlyDbError(e: unknown): string {
  const msg = (e as Error).message ?? 'Something went wrong.';
  if (msg.includes('violates check constraint')) {
    return 'One of the values here is not allowed. If you picked it from a dropdown, '
         + 'that is a bug — please report it.';
  }
  if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return 'That has already been recorded.';
  }
  if (msg.includes('violates foreign key')) {
    return 'Something this refers to no longer exists. Reload the page and try again.';
  }
  return msg;
}
