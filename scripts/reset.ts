/**
 * Drop everything and start over. Development only.
 *
 *   npm run db:reset && npm run db:migrate && npm run db:seed
 */
import './env';
import postgres from 'postgres';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run in production.');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  await sql`drop schema public cascade`;
  await sql`create schema public`;
  console.log('Schema dropped and recreated. Run: npm run db:migrate');
  await sql.end();
}

main();
