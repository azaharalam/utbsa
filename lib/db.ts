import postgres from 'postgres';

/**
 * One connection pool for the whole app.
 *
 * Next.js hot-reloads modules in development, which would otherwise open a new
 * pool on every save until Postgres refuses connections. Stashing it on
 * globalThis keeps a single pool alive across reloads.
 */
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

export const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL!, {
    max: 10,
    idle_timeout: 20,
    // Postgres returns DATE as a string; keep it that way so it does not shift
    // across timezones on the way to the browser.
    types: {
      date: { to: 1082, from: [1082], serialize: (v: string) => v, parse: (v: string) => v },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForDb.sql = sql;
