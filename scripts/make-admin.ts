/**
 * Promote a member to admin, and activate them.
 *
 *   npm run db:admin -- you@example.com
 *
 * Use this once to create the first admin. After that, promote people from
 * the admin UI so the change gets recorded in the audit log.
 */
import './env';
import postgres from 'postgres';

const email = process.argv[2];
if (!email) {
  console.error('Usage: npm run db:admin -- you@example.com');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  const rows = await sql<{ full_name: string; email: string }[]>`
    update members
    set status = 'active', role = 'admin', approved_at = now(),
        email_verified_at = coalesce(email_verified_at, now())
    where lower(email) = lower(${email})
    returning full_name, email
  `;

  if (!rows.length) {
    console.error(`No member with email ${email}. Sign up at /join first, then run this again.`);
    process.exit(1);
  }

  console.log(`${rows[0].full_name} <${rows[0].email}> is now an active admin.`);
  await sql.end();
}

main();
