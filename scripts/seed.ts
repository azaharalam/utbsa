/**
 * Demo content: two terms, three events, two blog posts.
 * Safe to run more than once.
 *
 *   npm run db:seed
 */
import './env';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  await sql`
    insert into terms (name, season, year, starts_on, ends_on, is_current) values
      ('Spring 2026','spring',2026,'2026-01-12','2026-05-02', false),
      ('Fall 2026','fall',2026,'2026-08-24','2026-12-12', true)
    on conflict (season, year) do nothing
  `;

  const [term] = await sql<{ id: string }[]>`select id from terms where is_current limit 1`;

  await sql`
    insert into events (slug, title, bengali_title, description, starts_at, ends_at, location_name, location_addr, term_id) values
      ('fall-picnic-2026','Fall Picnic', null,
       'Khichuri, cricket, and the annual argument about whether the beef was spicy enough. Families welcome — bring the kids.',
       '2026-09-12 15:00:00+00','2026-09-12 20:00:00+00',
       'Wildwood Metropark, Shelter 3','5100 W Central Ave, Toledo, OH 43615', ${term.id}),
      ('orientation-fall-2026','New Student Orientation', null,
       'Banking, phone plans, bus routes, groceries, and where to buy a winter coat that actually works. Come with questions.',
       '2026-09-27 19:00:00+00','2026-09-27 21:00:00+00',
       'Student Union 2582','2801 W Bancroft St, Toledo, OH 43606', ${term.id}),
      ('victory-day-2026','Victory Day','বিজয় দিবস',
       'Cultural programme followed by dinner. Performers wanted — talk to the event coordinator.',
       '2026-12-16 23:00:00+00', null, 'Venue to be confirmed', null, ${term.id})
    on conflict (slug) do nothing
  `;

  await sql`
    insert into posts (slug, title, excerpt, body, category, status, published_at) values
      ('ssn-in-toledo',
       'Getting your SSN in Toledo without losing a week',
       'Which office, what to bring, and when to go.',
       ${'Every year someone spends three separate mornings at the Social Security office and comes back without a number. It is almost always the same two mistakes, and both are avoidable.\n\n## Wait ten days first\n\nYour arrival record has to reach the SSA database before they can process anything. Show up on day three and you will be turned away politely and told to come back. Ten days after you enter the US, not ten days after classes start.\n\n## What to bring\n\nPassport, I-20, I-94 printout, and your offer letter from the department if you have an assistantship. Bring originals — photocopies are not accepted and there is no copier in the building.'},
       'Guide','published', now() - interval '7 days'),
      ('boishakh-1433',
       'Boishakh 1433, and the year we ran out of chairs',
       'Ninety people RSVPd. A hundred and forty came.',
       ${'## The chairs\n\nWe ordered ninety. A hundred and forty people came, which is a problem we are happy to have.\n\nNext year we are booking the larger hall and building an RSVP system that people actually use.'},
       'Event recap','published', now() - interval '30 days')
    on conflict (slug) do nothing
  `;

  console.log('Seeded.');
  await sql.end();
}

main();
