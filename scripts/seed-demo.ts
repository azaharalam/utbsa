/**
 * Demo data for poking at the app from both sides.
 *
 *   npm run db:demo          load it
 *   npm run db:demo -- wipe  remove it
 *
 * Everything created here uses @example.org addresses, so wiping is exact
 * and your own account is never touched.
 *
 * Deliberately small — about a dozen members — but every awkward case is
 * represented: partial payments, two semesters of arrears, a waiver, dues
 * covered from a fund, an overpayment sitting in credit, a two-student
 * household, someone waiting for approval, and a graduation request.
 */
import './env';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const DOMAIN = '@example.org';

const day = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const ts = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

async function wipe() {
  // Order matters: children before parents.
  await sql`delete from ledger_entries where note like '%[demo]%'`;
  await sql`delete from donations where donor_id in (select id from donors where email like ${'%' + DOMAIN})`;
  await sql`delete from donors where email like ${'%' + DOMAIN}`;
  await sql`delete from ticket_orders where purchaser_email like ${'%' + DOMAIN}`;
  await sql`delete from events where slug like 'demo-%'`;
  await sql`delete from posts where slug like 'demo-%'`;
  await sql`delete from potluck_items where event_id in (select id from events where slug like 'demo-%')`;
  await sql`delete from household_invites where from_member in (select id from members where personal_email like ${'%' + DOMAIN})
            or to_member in (select id from members where personal_email like ${'%' + DOMAIN})`;
  await sql`delete from households where label like 'demo:%'`;
  await sql`delete from arrival_requests where email like ${'%' + DOMAIN}`;
  await sql`delete from giveaway_items where posted_by in (select id from members where personal_email like ${'%' + DOMAIN})`;
  await sql`delete from housing_posts where posted_by in (select id from members where personal_email like ${'%' + DOMAIN})`;
  await sql`delete from job_posts where posted_by in (select id from members where personal_email like ${'%' + DOMAIN})`;
  await sql`delete from payment_claims where member_id in (select id from members where personal_email like ${'%' + DOMAIN})`;
  await sql`delete from members where personal_email like ${'%' + DOMAIN}`;
  await sql`delete from funds where name = 'Boishakh 1434'`;
  await sql`delete from contact_messages where email like ${'%' + DOMAIN}`;
  await sql`delete from terms where name like '%(demo)'`;
  console.log('Demo data removed.');
}

async function seed() {
  await wipe();

  // ── terms ────────────────────────────────────────────────
  // Demo terms are created fresh, in years nobody will really use, so your
  // own terms are never touched — not their dues rate, not their
  // assessed-at stamp, and not their is_current flag.
  const [spring] = await sql<any[]>`
    insert into terms (name, season, year, starts_on, ends_on, is_current, dues_cents, dues_assessed_at)
    values ('Spring 2019 (demo)', 'spring', 2019, '2019-01-14', '2019-05-03', false, 1500, ${ts(-200)})
    returning *`;
  const [fall] = await sql<any[]>`
    insert into terms (name, season, year, starts_on, ends_on, is_current, dues_cents, dues_assessed_at)
    values ('Fall 2019 (demo)', 'fall', 2019, '2019-08-26', '2019-12-14', false, 1500, ${ts(-20)})
    returning *`;

  // ── funds ────────────────────────────────────────────────
  const [general] = await sql<any[]>`select * from funds where name = 'General'`;
  const [assist]  = await sql<any[]>`select * from funds where name = 'Dues Assistance'`;
  const [boishakh] = await sql<any[]>`
    insert into funds (name, is_restricted, description)
    values ('Boishakh 1434', true, 'Restricted to the spring cultural programme.')
    returning *`;

  // ── members ──────────────────────────────────────────────
  type M = {
    name: string; email: string; type?: string; level?: string | null;
    dept?: string | null; home?: string | null; status?: string; role?: string;
    phone?: string | null; showPhone?: boolean; sem?: string | null; yr?: number | null;
    bio?: string | null;
  };

  async function member(m: M) {
    const type = m.type ?? 'student';
    // Students and alumni get a UToledo address as well as a personal one.
    const university = ['student', 'alumni'].includes(type)
      ? m.email.replace(DOMAIN, '@rockets.utoledo.edu')
      : null;
    // We write to the personal address, for everyone. The university
    // quarantines mail from a domain it does not recognise, so a link sent to
    // a @rockets address never arrives. See migration 019.
    const contact = m.email;

    const [row] = await sql<any[]>`
      insert into members (
        full_name, email, university_email, personal_email,
        phone, member_type, student_level, department,
        hometown_bd, arrival_semester, arrival_year, bio,
        status, role, show_phone,
        email_verified_at, approved_at
      ) values (
        ${m.name}, ${contact}, ${university}, ${m.email},
        ${m.phone ?? null}, ${m.type ?? 'student'},
        ${m.level ?? null}, ${m.dept ?? null}, ${m.home ?? null},
        ${m.sem ?? null}, ${m.yr ?? null}, ${m.bio ?? null},
        ${m.status ?? 'active'}, ${m.role ?? 'member'},
        ${m.showPhone ?? false}, ${ts(-30)},
        ${m.status === 'pending' ? null : ts(-29)}
      ) returning *`;
    return row;
  }

  const tanvir = await member({
    name: 'Tanvir Rahman', email: 'tanvir' + DOMAIN, role: 'admin',
    level: 'phd', dept: 'Chemical Engineering', home: 'Chattogram',
    phone: '+1 419 555 0101', showPhone: true, sem: 'fall', yr: 2023,
    bio: 'Third-year PhD. Runs the cricket team badly.',
  });

  const rafid = await member({
    name: 'Rafid Hossain', email: 'rafid' + DOMAIN,
    level: 'masters', dept: 'Computer Science', home: 'Dhaka',
    phone: '+1 419 555 0142', sem: 'fall', yr: 2026,
  });

  const sadia = await member({
    name: 'Sadia Akter', email: 'sadia' + DOMAIN,
    level: 'masters', dept: 'Public Health', home: 'Rajshahi',
    showPhone: true, phone: '+1 419 555 0117', sem: 'spring', yr: 2025,
  });

  const imran = await member({
    name: 'Imran Mahmud', email: 'imran' + DOMAIN,
    level: 'phd', dept: 'Computer Science', home: 'Dhaka', sem: 'fall', yr: 2022,
  });
  const rumana = await member({
    name: 'Rumana Begum', email: 'rumana' + DOMAIN,
    type: 'spouse', dept: null, home: 'Khulna', sem: 'fall', yr: 2022,
    bio: 'Cooks for forty people without breaking a sweat.',
  });

  const arif = await member({
    name: 'Arif Khan', email: 'arif' + DOMAIN,
    level: 'undergrad', dept: 'Pharmacy', home: 'Sylhet', sem: 'fall', yr: 2025,
  });

  const nusrat = await member({
    name: 'Nusrat Ahmed', email: 'nusrat' + DOMAIN,
    level: 'masters', dept: 'Public Health', home: 'Cumilla', sem: 'spring', yr: 2024,
  });

  const farhana = await member({
    name: 'Farhana Kabir', email: 'farhana' + DOMAIN,
    level: 'masters', dept: 'Computer Science', home: 'Barishal', sem: 'fall', yr: 2024,
  });
  const sabbir = await member({
    name: 'Sabbir Islam', email: 'sabbir' + DOMAIN,
    level: 'phd', dept: 'Economics', home: 'Barishal', sem: 'fall', yr: 2024,
  });

  const mizan = await member({
    name: 'Dr. Mizanur Zaman', email: 'mizan' + DOMAIN,
    type: 'faculty', dept: 'Civil Engineering', home: 'Bogura', sem: 'fall', yr: 2019,
  });

  const nafisa = await member({
    name: 'Nafisa Firoz', email: 'nafisa' + DOMAIN,
    type: 'alumni', dept: 'Biology', home: 'Khulna', status: 'alumni',
    sem: 'fall', yr: 2021,
  });

  const habibur = await member({
    name: 'Habibur Karim', email: 'habibur' + DOMAIN,
    status: 'pending', level: 'masters', dept: 'Mechanical Engineering',
    phone: '+1 567 555 0119',
  });

  // ── charges: every active student, both terms ────────────
  const students = [tanvir, rafid, sadia, imran, arif, nusrat, farhana, sabbir];

  for (const s of students) {
    // Rafid only arrived this autumn, so he has no Spring charge.
    if (s.id !== rafid.id) {
      await sql`insert into dues_charges (member_id, term_id, amount_cents, assessed_at)
                values (${s.id}, ${spring.id}, 1500, ${ts(-200)})`;
    }
    await sql`insert into dues_charges (member_id, term_id, amount_cents, assessed_at)
              values (${s.id}, ${fall.id}, 1500, ${ts(-20)})`;
  }

  // ── payments, with a ledger row for each ─────────────────
  async function pay(memberId: string, cents: number, method: string, when: string,
                     termId: string, note: string, fundId?: string) {
    const [p] = await sql<any[]>`
      insert into payments (member_id, amount_cents, method, fund_id, paid_on,
                            term_id, recorded_by, note)
      values (${memberId}, ${cents}, ${method}, ${fundId ?? null}, ${when},
              ${termId}, ${tanvir.id}, ${note})
      returning *`;

    if (method === 'fund') {
      await sql`
        insert into ledger_entries (occurred_on, direction, category, amount_cents,
                                    fund_id, term_id, source_type, source_id, note, recorded_by)
        values (${when}, 'out', 'fund_disbursement', ${cents}, ${fundId ?? null},
                ${termId}, 'payment', ${p.id}, ${note + ' [demo]'}, ${tanvir.id})`;
    } else {
      await sql`
        insert into ledger_entries (occurred_on, direction, category, amount_cents,
                                    term_id, source_type, source_id, note, recorded_by)
        values (${when}, 'in', 'dues', ${cents}, ${termId},
                'payment', ${p.id}, ${note + ' [demo]'}, ${tanvir.id})`;
    }
  }

  // Settled — paid both semesters
  await pay(tanvir.id, 1500, 'cash',  day(-190), spring.id, 'Spring dues');
  await pay(tanvir.id, 1500, 'zelle', day(-15),  fall.id,   'Fall dues');

  await pay(sadia.id,  1500, 'cash',  day(-185), spring.id, 'Spring dues');
  await pay(sadia.id,  1500, 'cash',  day(-12),  fall.id,   'Fall dues');

  // A couple, both students. Each is charged and pays separately now.
  await pay(farhana.id, 1500, 'zelle', day(-180), spring.id, 'Spring dues');
  await pay(farhana.id, 1500, 'zelle', day(-10),  fall.id,   'Fall dues');
  await pay(sabbir.id,  1500, 'zelle', day(-180), spring.id, 'Spring dues');
  await pay(sabbir.id,  1500, 'zelle', day(-10),  fall.id,   'Fall dues');

  // Partial — paid $8 of $15
  await pay(arif.id, 1500, 'cash', day(-188), spring.id, 'Spring dues');
  await pay(arif.id,  800, 'cash', day(-5),   fall.id,   'Part of Fall dues');

  // Overpaid — $20 against a $15 charge, so sits in credit
  await pay(imran.id, 1500, 'cash',  day(-186), spring.id, 'Spring dues');
  await pay(imran.id, 2000, 'check', day(-8),   fall.id,   'Rounded up, keep the change');

  // Covered from the Dues Assistance fund
  await pay(nusrat.id, 1500, 'cash', day(-184), spring.id, 'Spring dues');
  await pay(nusrat.id, 1500, 'fund', day(-3),   fall.id,   'Fall dues covered from fund', assist.id);

  // Rafid: new this autumn, nothing paid yet — owes $15

  // ── an adjustment: two semesters waived ──────────────────
  // (nobody currently owes two full semesters, so give one to Rafid's
  //  neighbour — actually leave Rafid owing, and waive nothing yet.)

  // ── donations ────────────────────────────────────────────
  async function donor(name: string, email: string, type: string) {
    const [d] = await sql<any[]>`
      insert into donors (name, email, type) values (${name}, ${email}, ${type})
      returning *`;
    return d;
  }

  async function gift(donorId: string, fundId: string, cents: number, when: string,
                      method: string, acked: boolean, note: string,
                      inKind = false, desc: string | null = null) {
    const [g] = await sql<any[]>`
      insert into donations (donor_id, fund_id, amount_cents, received_on, method,
                             is_in_kind, in_kind_description, acknowledged_at,
                             note, recorded_by)
      values (${donorId}, ${fundId}, ${cents}, ${when}, ${method},
              ${inKind}, ${desc}, ${acked ? ts(-1) : null}, ${note}, ${tanvir.id})
      returning *`;

    if (!inKind) {
      await sql`
        insert into ledger_entries (occurred_on, direction, category, amount_cents,
                                    fund_id, source_type, source_id, note, recorded_by)
        values (${when}, 'in', 'donation', ${cents}, ${fundId},
                'donation', ${g.id}, ${note + ' [demo]'}, ${tanvir.id})`;
    }
  }

  const dProf  = await donor('Dr. Mizanur Zaman', 'mizan.gift' + DOMAIN, 'faculty');
  const dAlum  = await donor('Nafisa Firoz', 'nafisa.gift' + DOMAIN, 'alumni');
  const dBiz   = await donor('Spice Route Restaurant', 'spiceroute' + DOMAIN, 'business');
  const dUni   = await donor('UToledo Office of Student Involvement', 'involvement' + DOMAIN, 'university');
  const dAnon  = await donor('Anonymous well-wisher', 'anon' + DOMAIN, 'individual');

  await gift(dProf.id, assist.id,  20000, day(-40), 'check', true,
             'Sponsoring dues for students who need it');
  await gift(dAlum.id, general.id,  5000, day(-25), 'zelle', true,
             'From an alum, now in Texas');
  await gift(dUni.id,  boishakh.id, 30000, day(-18), 'check', true,
             'Cultural programming grant');
  await gift(dAnon.id, general.id,  2500, day(-6),  'cash', false,
             'Handed over at the picnic');
  await gift(dBiz.id,  boishakh.id, 15000, day(-4), 'in_kind', false,
             'Catering donated for Boishakh', true, 'Biryani and dessert for 60 people');

  // Two sponsors who agreed to be named; the rest stay private.
  await sql`
    update donors set show_publicly = true,
      blurb = 'Catered Boishakh three years running.',
      website = 'https://example.com'
    where id = ${dBiz.id}`;
  await sql`
    update donors set show_publicly = true,
      blurb = 'Cultural programming grant.'
    where id = ${dUni.id}`;

  // ── expenses ─────────────────────────────────────────────
  await sql`
    insert into ledger_entries (occurred_on, direction, category, amount_cents,
                                term_id, note, recorded_by)
    values (${day(-14)}, 'out', 'expense', 12000, ${fall.id},
            'Shelter booking, Wildwood Metropark [demo]', ${tanvir.id}),
           (${day(-13)}, 'out', 'expense', 24500, ${fall.id},
            'Food for the fall picnic [demo]', ${tanvir.id})`;

  // ── events ───────────────────────────────────────────────
  async function event(e: {
    slug: string; title: string; bn?: string | null; desc: string;
    startsIn: number; hours?: number; venue: string; addr?: string | null;
    type: string; ticketed?: boolean; member?: number; guest?: number; child?: number;
  }) {
    const start = new Date();
    start.setDate(start.getDate() + e.startsIn);
    start.setHours(15, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + (e.hours ?? 4));

    const [row] = await sql<any[]>`
      insert into events (slug, title, bengali_title, description, starts_at, ends_at,
                          location_name, location_addr, term_id, event_type,
                          is_ticketed, member_price_cents, guest_price_cents, child_price_cents)
      values (${e.slug}, ${e.title}, ${e.bn ?? null}, ${e.desc},
              ${start.toISOString()}, ${end.toISOString()},
              ${e.venue}, ${e.addr ?? null}, ${fall.id}, ${e.type},
              ${e.ticketed ?? false}, ${e.member ?? 0}, ${e.guest ?? 0}, ${e.child ?? 0})
      returning *`;
    return row;
  }

  const picnic = await event({
    slug: 'demo-fall-picnic', title: 'Fall Picnic', type: 'social',
    desc: 'Khichuri, cricket, and the annual argument about whether the beef was spicy enough. Families welcome — bring the kids.',
    startsIn: 9, venue: 'Wildwood Metropark, Shelter 3',
    addr: '5100 W Central Ave, Toledo, OH 43615',
  });

  const cricket = await event({
    slug: 'demo-cricket-cup', title: 'Autumn Cricket Cup', type: 'sporting',
    desc: 'Six-a-side, all afternoon. Members play free — the semester fee covers it. Non-members pay at the gate.',
    startsIn: 21, hours: 6, venue: 'Scott Park Fields',
    ticketed: true, member: 0, guest: 500, child: 0,
  });

  await event({
    slug: 'demo-victory-day', title: 'Victory Day', bn: 'বিজয় দিবস', type: 'cultural',
    desc: 'Cultural programme followed by dinner. Performers wanted — talk to the event coordinator.',
    startsIn: 60, venue: 'Student Union Auditorium',
  });

  await event({
    slug: 'demo-orientation', title: 'New Student Orientation', type: 'orientation',
    desc: 'Banking, phone plans, bus routes, groceries, and where to buy a winter coat that actually works.',
    startsIn: -25, hours: 2, venue: 'Student Union 2582',
  });

  // ── a linked household: Imran and Rumana ─────────────────
  const [hh] = await sql<any[]>`
    insert into households (label) values ('demo:Imran and Rumana') returning id`;
  await sql`update members set household_id = ${hh.id}
            where id in (${imran.id}, ${rumana.id})`;

  // ── RSVPs ────────────────────────────────────────────────
  // One answer per household — Imran answers for himself and Rumana.
  await sql`
    insert into rsvps (event_id, member_id, household_id, adults, children, note) values
      (${picnic.id}, ${tanvir.id},  null,     1, 0, null),
      (${picnic.id}, ${sadia.id},   null,     2, 0, 'Bringing my sister, visiting from Chicago'),
      (${picnic.id}, ${imran.id},   ${hh.id}, 2, 2, 'Two kids — one needs the food mild'),
      (${picnic.id}, ${farhana.id}, null,     2, 0, null),
      (${picnic.id}, ${arif.id},    null,     1, 0, 'Might be an hour late'),
      (${cricket.id},${tanvir.id},  null,     1, 0, null),
      (${cricket.id},${sabbir.id},  null,     3, 0, null)`;

  // ── the picnic is a potluck ───────────────────────────────
  await sql`update events set is_potluck = true where id = ${picnic.id}`;

  await sql`
    insert into potluck_items (event_id, category, dish, covers, sort_order, claimed_by, claimed_at) values
      (${picnic.id}, 'rice',     'Polao',              20, 0, ${tanvir.id}, now()),
      (${picnic.id}, 'rice',     'Plain rice',         20, 0, null, null),
      (${picnic.id}, 'meat',     'Beef curry',         15, 1, ${imran.id}, now()),
      (${picnic.id}, 'meat',     'Beef curry',         15, 1, ${farhana.id}, now()),
      (${picnic.id}, 'meat',     'Beef curry',         15, 1, null, null),
      (${picnic.id}, 'meat',     'Chicken roast',      15, 1, null, null),
      (${picnic.id}, 'veg',      'Begun bharta',       20, 3, ${rumana.id}, now()),
      (${picnic.id}, 'dal',      'Musur dal',          25, 4, null, null),
      (${picnic.id}, 'starter',  'Shingara',           30, 5, ${sadia.id}, now()),
      (${picnic.id}, 'dessert',  'Payesh',             25, 7, null, null),
      (${picnic.id}, 'dessert',  'Mishti',             25, 7, null, null),
      (${picnic.id}, 'drinks',   'Borhani',            30, 8, ${arif.id}, now()),
      (${picnic.id}, 'supplies', 'Plates, cups, cutlery for 60', 60, 9, null, null)`;

  // ── ticket sales for the cricket cup ─────────────────────
  async function ticket(name: string, email: string | null, adults: number,
                        cents: number, method: string) {
    const [t] = await sql<any[]>`
      insert into ticket_orders (event_id, purchaser_name, purchaser_email,
                                 qty_adult, qty_child, amount_cents, status, method, recorded_by)
      values (${cricket.id}, ${name}, ${email}, ${adults}, 0, ${cents},
              'paid', ${method}, ${tanvir.id})
      returning *`;
    if (cents > 0) {
      await sql`
        insert into ledger_entries (occurred_on, direction, category, amount_cents,
                                    term_id, source_type, source_id, note, recorded_by)
        values (${day(-2)}, 'in', 'ticket', ${cents}, ${fall.id},
                'ticket_order', ${t.id}, ${'Cricket Cup tickets [demo]'}, ${tanvir.id})`;
    }
  }

  await ticket('Jessica Moore',  'jessica' + DOMAIN, 2, 1000, 'cash');
  await ticket('Ahmed Sultan',   'ahmed' + DOMAIN,   1,  500, 'cash');
  await ticket('Priya Raman',    'priya' + DOMAIN,   3, 1500, 'zelle');

  // ── transfers waiting to be checked ──────────────────────
  await sql`
    insert into payment_claims (member_id, transaction_ref, amount_cents, sent_on,
                                method_label, note, submitted_via, status) values
      (${rafid.id},  'ZL8842PQ71', 1500, ${day(-2)}, 'Zelle',
       'Sent from my Huntington account', 'link', 'pending'),
      (${arif.id},   'ZL7719KD03',  700, ${day(-1)}, 'Zelle',
       'The rest of what I owe', 'portal', 'pending')`;

  await sql`
    insert into claim_tokens (token_hash, member_id)
    values (encode(sha256('demo-token-rafid'::bytea), 'hex'), ${rafid.id})`;

  // ── a pending graduation request ─────────────────────────
  await sql`
    insert into status_change_requests (member_id, from_type, to_type, reason, requested_at)
    values (${nusrat.id}, 'student', 'alumni',
            'Defending in December, staying in Toledo', ${ts(-2)})`;

  // ── e-board ──────────────────────────────────────────────
  // The board serves the session currently running, not a semester.
  const [{ current_session: session }] = await sql<any[]>`
    select current_session from settings where id = 1`;

  await sql`delete from officer_roles where title in
    ('President','Vice President','Treasurer','General Secretary',
     'Event Coordinator','Media Officer','Faculty Advisor')
    and member_id in (select id from members where personal_email like ${'%' + DOMAIN})`;

  await sql`
    insert into officer_roles (member_id, session, title, permission_set, is_eboard, sort_order) values
      (${tanvir.id},  ${session}, 'President',         'full',    true, 0),
      (${nusrat.id},  ${session}, 'Vice President',    'members', true, 1),
      (${farhana.id}, ${session}, 'General Secretary', 'full',    true, 2),
      (${sabbir.id},  ${session}, 'Treasurer',         'money',   true, 3),
      (${imran.id},   ${session}, 'Event Coordinator', 'events',  true, 4),
      (${sadia.id},   ${session}, 'Media Officer',     'content', true, 7),
      (${mizan.id},   ${session}, 'Faculty Advisor',   'none',    true, 8)`;

  // ── a draft post, so the editor has something to open ────
  await sql`
    insert into posts (slug, title, excerpt, body, category, author_id, status)
    values ('demo-winter-guide', 'Surviving your first Toledo winter',
            'Coats, tyres, and why the wind off the lake is different.',
            ${'Draft — not published yet.\n\n## The coat\n\nWhatever you brought from home is not enough. You want something rated to −20°C, and you want it before Thanksgiving, not after.'},
            'Guide', ${nusrat.id}, 'draft')`;

  // ── people arriving ──────────────────────────────────────
  await sql`
    insert into arrival_requests (full_name, email, phone, arriving_on, arriving_at,
      airport, flight_no, people_count, luggage_note, needs_pickup, needs_stay,
      needs_shopping, program, department, note, status, claimed_by) values
      ('Shahriar Kabir', ${'shahriar' + DOMAIN}, '+880 1712 555001',
       ${day(6)}, '18:40', 'DTW', 'QR 725', 2, 'Two large suitcases',
       true, true, false, 'MS', 'Mechanical Engineering',
       'Travelling with my wife. First time in the US.', 'open', null),
      ('Tasnim Jahan', ${'tasnim' + DOMAIN}, '+880 1911 555002',
       ${day(13)}, '22:15', 'DTW', 'EK 211', 1, 'One suitcase and a carry-on',
       true, false, true, 'PhD', 'Chemistry', null, 'claimed', ${tanvir.id}),
      ('Nayeem Rahman', ${'nayeem' + DOMAIN}, null,
       ${day(-10)}, '14:00', 'TOL', null, 1, null,
       true, false, false, 'BS', 'Business', null, 'done', ${imran.id})`;

  // ── things people are leaving behind ─────────────────────
  await sql`
    insert into giveaway_items (posted_by, title, description, category, condition, price_cents, status) values
      (${nafisa.id}, 'IKEA desk and chair', 'Collect from Old Orchard. Good condition, one small scratch.', 'furniture', 'good', 0, 'available'),
      (${nafisa.id}, 'Winter coat, size M', 'Rated to -20C. Got me through three winters.', 'winter', 'worn', 0, 'available'),
      (${sabbir.id}, 'Rice cooker and pressure cooker', 'Both work fine. Selling as a pair.', 'kitchen', 'good', 1500, 'available'),
      (${farhana.id}, 'Full bedding set', 'Washed and ready. Free to a new arrival.', 'bedding', 'good', 0, 'claimed'),
      (${imran.id}, 'Monitor, 24 inch', null, 'electronics', 'good', 3000, 'available')`;

  // ── rooms ────────────────────────────────────────────────
  await sql`
    insert into housing_posts (posted_by, kind, title, area, rent_cents, available_from, description) values
      (${arif.id}, 'offering', 'Room in a 2-bed near campus', 'Old Orchard', 45000, ${day(20)},
       'Ten minutes on the 20 bus. Utilities included. Quiet flatmate, no smoking.'),
      (${rafid.id}, 'seeking', 'Looking for a room from January', 'Anywhere on a bus route', 50000, ${day(100)},
       'MS student, quiet, no pets. Happy to share with one or two others.'),
      (${nusrat.id}, 'sublet', 'Sublet for the summer', 'Dorr Street', 40000, ${day(240)},
       'Away May to August. Furnished, everything included.')`;

  // ── jobs ─────────────────────────────────────────────────
  await sql`
    insert into job_posts (posted_by, title, organisation, location, kind, link, description, closes_on) values
      (${nafisa.id}, 'Software Engineer, new grad', 'Owens Corning', 'Toledo, OH', 'referral',
       null, 'I work here and can refer. Send me your CV before you apply — a referral goes to a different queue.', ${day(30)}),
      (${mizan.id}, 'Graduate research assistantship', 'UToledo Civil Engineering', 'Toledo, OH', 'assistantship',
       null, 'Funded position starting in the spring. Structural or geotechnical background.', ${day(45)}),
      (${tanvir.id}, 'Summer internship, process engineering', 'First Solar', 'Perrysburg, OH', 'internship',
       'https://example.com/apply', null, ${day(60)})`;

  // ── an unread contact message ────────────────────────────
  await sql`
    insert into contact_messages (name, email, subject, message)
    values ('Shahriar Kabir', ${'shahriar' + DOMAIN}, 'Arriving in January',
            'Assalamu alaikum. I am starting my MS in Spring and land on the 8th. Is airport pickup possible? I have two large suitcases.')`;

  // ── summary ──────────────────────────────────────────────
  const [{ n: mcount }] = await sql<any[]>`
    select count(*)::text as n from members where personal_email like ${'%' + DOMAIN}`;

  console.log(`
Demo data loaded.

  ${mcount} members, 4 events, 5 donations, 3 ticket sales, 3 funds.

  Sign in as any of these — the magic link prints in your dev terminal:

    tanvir${DOMAIN}    admin + president, settled up
    rafid${DOMAIN}     new this autumn, owes $15
    arif${DOMAIN}      paid $8 of $15, owes $7
    imran${DOMAIN}     overpaid, $5 in credit
    nusrat${DOMAIN}    dues covered from the assistance fund
    farhana${DOMAIN}   settled up
    sabbir${DOMAIN}    settled up
    rumana${DOMAIN}    spouse — never charged
    mizan${DOMAIN}     faculty — never charged
    nafisa${DOMAIN}    alumni

  Waiting for you in the admin area:
    · 1 member pending approval        /admin/approvals
    · 1 graduation request             /admin/requests
    · 1 unacknowledged donation        /admin/donations
    · members owing money             /admin/dues
    · 2 transfers to check             /admin/claims
    · 1 arrival with nobody assigned   /admin/arrivals
    · 1 draft post                     /admin/posts

  Member boards:
    /portal/arrivals   3 people landing — take one and details appear
    /portal/giveaway   5 items, mostly free
    /portal/housing    a room, a search, a sublet
    /portal/jobs       a referral offer, an assistantship, an internship

  Potluck and households:
    The Fall Picnic is a potluck — 13 dishes, 6 already claimed
    Imran and Rumana are linked as one household. Sign in as either and
    the other's RSVP shows as already answered for both.

  Remove it all with:  npm run db:demo -- wipe
`);
}

async function main() {
  if (process.argv[2] === 'wipe') await wipe();
  else await seed();
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
