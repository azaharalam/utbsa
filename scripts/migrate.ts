/**
 * Migration runner.
 *
 * Applies every .sql file in db/migrations that has not run yet, in filename
 * order, each inside a transaction. A failed migration rolls back completely,
 * so you never end up half-applied.
 *
 *   npm run db:migrate
 */
import './env';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const dir = join(process.cwd(), 'db', 'migrations');

async function main() {
  await sql`
    create table if not exists _migrations (
      name text primary key,
      run_at timestamptz not null default now()
    )
  `;

  const done = new Set(
    (await sql<{ name: string }[]>`select name from _migrations`).map((r) => r.name)
  );

  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  let applied = 0;

  for (const file of files) {
    if (done.has(file)) continue;
    const body = readFileSync(join(dir, file), 'utf8');

    process.stdout.write(`  ${file} … `);
    try {
      await sql.begin(async (tx) => {
        await tx.unsafe(body).simple();
        await tx`insert into _migrations (name) values (${file})`;
      });
      console.log('ok');
      applied++;
    } catch (e) {
      console.log('FAILED');
      console.error(e);
      process.exit(1);
    }
  }

  console.log(applied ? `\nApplied ${applied} migration(s).` : '\nAlready up to date.');
  await sql.end();
}

main();
