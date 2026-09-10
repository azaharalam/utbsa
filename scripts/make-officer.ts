/**
 * Give someone an office, and activate their account.
 *
 *   npm run db:officer -- azaharalam2233@gmail.com "General Secretary" full \
 *     --name "Md. Azahar Alam" --phone "419 246 7235"
 *
 *   npm run db:officer -- treasurer@example.com "Treasurer" money
 *
 * This is how the FIRST officer gets created on a fresh database — there is
 * nobody to do it from the admin UI yet. After that, assign offices at
 * /admin/offices so the change is recorded in the audit log.
 *
 * It replaces the old `db:admin`, which set `role = 'admin'`. Since migration
 * 007 that column grants nothing: access comes from the office someone holds.
 * The old script ran, printed success, and left the person with no access at
 * all.
 */
import './env';
import postgres from 'postgres';

const SETS = ['full', 'money', 'members', 'content', 'events', 'none'] as const;
type Set = typeof SETS[number];

const GRANTS: Record<Set, string> = {
  full: 'everything, including assigning offices',
  money: 'dues, transfers, donations, funds, ledger',
  members: 'approvals, member records, posts, events',
  content: 'posts and events',
  events: 'events only',
  none: 'listed publicly, no admin access',
};

/** Display order, so the e-board page reads correctly without anyone typing a number. */
const ORDER = [
  'President', 'Vice President', 'General Secretary', 'Treasurer',
  'Event Coordinator', 'Cultural Secretary', 'Sports Secretary',
  'Media Officer', 'Faculty Advisor', 'Administrator',
];

function flag(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] ?? null : null;
}

const email = process.argv[2];
const title = process.argv[3] ?? 'Administrator';
const set = (process.argv[4] ?? 'full') as Set;
const name = flag('name');
const phone = flag('phone');

if (!email || !SETS.includes(set)) {
  console.error(`
  Usage:
    npm run db:officer -- <email> "<Office title>" <access> [--name "Full Name"] [--phone "..."]

  Access levels:
${SETS.map((s) => `    ${s.padEnd(9)} ${GRANTS[s]}`).join('\n')}

  Example:
    npm run db:officer -- you@utoledo.edu "General Secretary" full --phone "419 246 7235"
`);
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  const e = email.trim().toLowerCase();

  // Any of a member's addresses identifies them.
  let [member] = await sql<any[]>`
    select id, full_name, email from members
    where lower(email) = ${e} or lower(university_email) = ${e}
       or lower(personal_email) = ${e}
    limit 1
  `;

  if (!member) {
    if (!name) {
      console.error(
        `\n  No member with ${email}.\n`
        + `  Either sign up at /join first, or pass --name "Full Name" to create them here.\n`
      );
      process.exit(1);
    }

    const isUniversity = /utoledo\.edu$/i.test(e);
    [member] = await sql<any[]>`
      insert into members (
        full_name, email, university_email, personal_email, phone,
        member_type, status, email_verified_at, approved_at
      ) values (
        ${name}, ${e},
        ${isUniversity ? e : null},
        ${isUniversity ? null : e},
        ${phone}, 'student', 'active', now(), now()
      ) returning id, full_name, email
    `;
    console.log(`  created ${member.full_name} <${member.email}>`);
  } else {
    await sql`
      update members
      set status = 'active',
          approved_at = coalesce(approved_at, now()),
          email_verified_at = coalesce(email_verified_at, now()),
          phone = coalesce(${phone}, phone)
      where id = ${member.id}
    `;
    console.log(`  found ${member.full_name} <${member.email}>`);
  }

  const [settings] = await sql<{ current_session: string }[]>`
    select current_session from settings where id = 1
  `;
  const session = settings?.current_session ?? '2026-27';

  // One office per person — end whatever they hold before assigning.
  const ended = await sql<{ title: string }[]>`
    update officer_roles set ended_at = now()
    where member_id = ${member.id} and ended_at is null
    returning title
  `;
  if (ended.length) {
    console.log(`  ended their previous office: ${ended.map((r) => r.title).join(', ')}`);
  }

  const order = ORDER.findIndex((t) => t.toLowerCase() === title.toLowerCase());

  await sql`
    insert into officer_roles (member_id, session, title, permission_set, is_eboard, sort_order)
    values (${member.id}, ${session}, ${title}, ${set}, true,
            ${order === -1 ? ORDER.length : order})
  `;

  const [{ n: fullAccess }] = await sql<{ n: string }[]>`
    select count(*)::text n from officer_roles
    where ended_at is null and permission_set = 'full'
  `;

  console.log(`
  ${member.full_name} is now ${title} for ${session}.
  Access: ${GRANTS[set]}

  They sign in at /auth/login with ${member.email} — no password, and nothing
  else to set up. The extra sections appear the moment they do.
`);

  if (Number(fullAccess) < 2) {
    console.log(
      `  Note: only ${fullAccess} office has full access. If that person loses\n`
      + `  their account, nobody can administer the site. Give a second person\n`
      + `  full access before launch.\n`
    );
  }

  await sql.end();
}

main().catch(async (e) => {
  console.error(`\n  ${(e as Error).message}\n`);
  await sql.end();
  process.exit(1);
});
