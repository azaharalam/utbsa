/**
 * Next.js loads .env files itself; standalone scripts do not.
 *
 * The order matters and mirrors Next's own: the first file to define a
 * variable wins, so a local override always beats the deployed values.
 *
 * This exists because `npm run db:migrate` on the server was silently
 * finding no DATABASE_URL and falling back to connecting as the OS user —
 * which fails with "password authentication failed for user deploy" and
 * gives no hint that the real problem is a file that was never read.
 */
import { config } from 'dotenv';
import { existsSync } from 'fs';

const files = [
  '.env.local',        // a developer's machine
  '.env.production',   // the droplet
  '.env',              // anything else
];

const loaded: string[] = [];
for (const path of files) {
  if (!existsSync(path)) continue;
  config({ path });
  loaded.push(path);
}

// Say which file was used. A script connecting to the wrong database because
// it read the wrong file is a bad half-hour, and one line prevents it.
if (process.env.DEBUG_ENV) {
  console.log(`env loaded from: ${loaded.join(', ') || '(none found)'}`);
}

if (!process.env.DATABASE_URL) {
  console.error(
    `\n  No DATABASE_URL found.\n`
    + `  Looked for: ${files.join(', ')} in ${process.cwd()}\n`
    + `  Found:      ${loaded.join(', ') || 'nothing'}\n`
  );
}
