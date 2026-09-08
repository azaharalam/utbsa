/**
 * Checks that Phase 1 and Phase 2 are actually complete and wired up.
 *
 *   npm run doctor
 *
 * Reads only. Never writes to the database or edits a file.
 * Every failure prints the exact fix.
 */
import './env';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

const root = process.cwd();
let pass = 0, warn = 0, fail = 0;
const fixes: string[] = [];

const g = (s: string) => `\x1b[32m${s}\x1b[0m`;
const y = (s: string) => `\x1b[33m${s}\x1b[0m`;
const r = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

function ok(msg: string)   { pass++; console.log(`  ${g('✓')} ${msg}`); }
function bad(msg: string, fix?: string) {
  fail++; console.log(`  ${r('✗')} ${msg}`);
  if (fix) { console.log(`      ${dim(fix)}`); fixes.push(fix); }
}
function meh(msg: string, note?: string) {
  warn++; console.log(`  ${y('!')} ${msg}`);
  if (note) console.log(`      ${dim(note)}`);
}
function head(t: string) { console.log(`\n\x1b[1m${t}\x1b[0m`); }

const read = (p: string) => { try { return readFileSync(join(root, p), 'utf8'); } catch { return null; } };

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  console.log('\n\x1b[1mUTBSA — checking Phase 1 and Phase 2\x1b[0m');

  // ══════════════════════ environment ══════════════════════
  head('Environment');
  for (const k of ['DATABASE_URL', 'SESSION_SECRET', 'NEXT_PUBLIC_SITE_URL']) {
    if (process.env[k]) ok(`${k} is set`);
    else bad(`${k} is missing`, `Add ${k} to .env.local`);
  }

  const secret = process.env.SESSION_SECRET ?? '';
  if (secret.length < 32 || secret.startsWith('change_me')) {
    bad('SESSION_SECRET is weak or still the placeholder',
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  } else ok('SESSION_SECRET looks real');

  if (process.env.MAIL_TRANSPORT === 'console') {
    meh('Email prints to the terminal (fine for development)',
        'Set MAIL_TRANSPORT=smtp with SMTP_* before launch, or approval emails never arrive.');
  } else if (process.env.MAIL_TRANSPORT === 'smtp') {
    if (process.env.SMTP_HOST) ok('SMTP configured');
    else bad('MAIL_TRANSPORT=smtp but SMTP_HOST is empty', 'Fill in SMTP_* or go back to console');
  }

  // ══════════════════════ files ══════════════════════
  head('Files');
  const files: [string, string][] = [
    ['lib/db.ts', 'connection pool'],
    ['lib/crypto.ts', 'token hashing'],
    ['lib/session.ts', 'sessions and route guards'],
    ['lib/audit.ts', 'audit log'],
    ['lib/mail.ts', 'email'],
    ['lib/money.ts', 'money helpers'],
    ['lib/queries/members.ts', 'member authorization'],
    ['lib/queries/content.ts', 'posts and events'],
    ['lib/queries/tokens.ts', 'magic links'],
    ['lib/queries/dues.ts', 'dues and balances'],
    ['lib/queries/donations.ts', 'donations and funds'],
    ['lib/queries/ledger.ts', 'ledger'],
    ['lib/queries/settings.ts', 'settings'],
    ['app/actions/auth.ts', 'signup and login'],
    ['app/actions/profile.ts', 'profile editing'],
    ['app/actions/admin.ts', 'admin actions'],
    ['app/actions/money.ts', 'money actions'],
    ['app/actions/contact.ts', 'contact form'],
    ['components/money/rsvp.tsx', 'RSVP widget'],
    ['components/money/graduate.tsx', 'graduation request'],
    ['components/money/forms.tsx', 'money form helpers'],
    ['scripts/env.ts', 'env loader for CLI scripts'],
    ['scripts/migrate.ts', 'migration runner'],
  ];
  let missing = 0;
  for (const [f, what] of files) if (!existsSync(join(root, f))) { bad(`${f} missing — ${what}`); missing++; }
  if (!missing) ok(`all ${files.length} core files present`);

  head('Pages');
  const pages: [string, string][] = [
    ['app/(site)/page.tsx', 'home'],
    ['app/(site)/about/page.tsx', 'about'],
    ['app/(site)/eboard/page.tsx', 'e-board'],
    ['app/(site)/events/page.tsx', 'events'],
    ['app/(site)/events/[slug]/page.tsx', 'event detail'],
    ['app/(site)/blog/page.tsx', 'blog'],
    ['app/(site)/blog/[slug]/page.tsx', 'blog post'],
    ['app/(site)/contact/page.tsx', 'contact'],
    ['app/(site)/join/page.tsx', 'join'],
    ['app/auth/login/page.tsx', 'sign in'],
    ['app/auth/verify/route.ts', 'magic link handler'],
    ['app/auth/pending/page.tsx', 'awaiting approval'],
    ['app/portal/page.tsx', 'member dashboard'],
    ['app/portal/profile/page.tsx', 'profile'],
    ['app/portal/directory/page.tsx', 'directory'],
    ['app/portal/dues/page.tsx', 'my dues'],
    ['app/admin/page.tsx', 'admin overview'],
    ['app/admin/approvals/page.tsx', 'approvals'],
    ['app/admin/members/page.tsx', 'members'],
    ['app/admin/posts/page.tsx', 'posts'],
    ['app/admin/events/page.tsx', 'events admin'],
    ['app/admin/eboard/page.tsx', 'e-board admin'],
    ['app/admin/dues/page.tsx', 'dues'],
    ['app/admin/donations/page.tsx', 'donations'],
    ['app/admin/funds/page.tsx', 'funds'],
    ['app/admin/ledger/page.tsx', 'ledger'],
    ['app/admin/requests/page.tsx', 'status requests'],
    ['app/admin/settings/page.tsx', 'settings'],
  ];
  missing = 0;
  for (const [f, what] of pages) if (!existsSync(join(root, f))) { bad(`${f} missing — ${what}`); missing++; }
  if (!missing) ok(`all ${pages.length} pages present`);

  // ══════════════════════ wiring ══════════════════════
  head('Wiring');
  const adminNav = read('app/admin/layout.tsx') ?? '';
  for (const [href, label] of [
    ['/admin/dues', 'Dues'],
    ['/admin/donations', 'Donations'], ['/admin/funds', 'Funds'],
    ['/admin/ledger', 'Ledger'], ['/admin/requests', 'Requests'],
    ['/admin/settings', 'Settings'],
  ]) {
    if (adminNav.includes(href)) ok(`admin nav has ${label}`);
    else bad(`admin nav is missing ${label}`, `Add { href: '${href}', label: '${label}' } to app/admin/layout.tsx`);
  }

  const portalNav = read('app/portal/layout.tsx') ?? '';
  if (portalNav.includes('/portal/dues')) ok('portal nav has My dues');
  else bad('portal nav is missing My dues', "Add { href: '/portal/dues', label: 'My dues' } to app/portal/layout.tsx");

  const evPage = read('app/(site)/events/[slug]/page.tsx') ?? '';
  if (evPage.includes('RsvpBox')) ok('event page shows the RSVP box');
  else bad('event page has no RSVP box', 'The RsvpBox patch did not apply to app/(site)/events/[slug]/page.tsx');

  const profForm = read('app/portal/profile/form.tsx') ?? '';
  if (profForm.includes('GraduateBox')) ok('profile has the graduation request');
  else bad('profile has no graduation request', 'The GraduateBox patch did not apply to app/portal/profile/form.tsx');

  const types = read('lib/types.ts') ?? '';
  if (types.includes('household_id')) ok('Member type has household_id');
  else bad('Member type is missing household_id', 'Add "household_id: string | null;" to Member in lib/types.ts');

  // ══════════════════════ safety invariants ══════════════════════
  head('Safety rules');
  const members = read('lib/queries/members.ts') ?? '';
  if (members.includes('assertAdmin')) ok('member queries check for admin');
  else bad('lib/queries/members.ts has no assertAdmin — admin data is unprotected');

  if (members.includes('case when show_phone')) ok('directory hides private fields in SQL');
  else bad('directory is not filtering private fields — phone numbers may leak');

  const dues = read('lib/queries/dues.ts') ?? '';
  if (dues.includes('assertAdmin')) ok('dues queries check for admin');
  else bad('lib/queries/dues.ts has no assertAdmin');

  const selfEdit = members.match(/export type SelfEditable = \{[\s\S]*?\}/)?.[0] ?? '';
  const leaked = ['role', 'status:', 'email:'].filter((f) => selfEdit.includes(f));
  if (!leaked.length) ok('members cannot edit their own role or status');
  else bad(`SelfEditable exposes ${leaked.join(', ')} — a member could promote themselves`);

  const mid = read('middleware.ts');
  if (mid && /from '@\/lib\/db'|postgres\(/.test(mid)) {
    bad('middleware.ts opens a database connection',
        'Edge runtime cannot reach Postgres. Guards belong in the layouts.');
  } else ok('no database access in middleware');

  // ══════════════════════ database ══════════════════════
  head('Database');
  let dbUp = true;
  try { await sql`select 1`; ok('connected'); }
  catch (e) {
    dbUp = false;
    bad(`cannot connect: ${(e as Error).message}`, 'sudo systemctl start postgresql');
  }

  if (dbUp) {
    const applied = (await sql<{ name: string }[]>`select name from _migrations order by name`)
      .map((m) => m.name);
    for (const m of ['001_init.sql', '002_arrival_semester.sql', '003_drop_program.sql',
                     '004_money.sql', '005_drop_households.sql']) {
      if (applied.includes(m)) ok(`migration ${m}`);
      else bad(`migration ${m} has not run`, 'npm run db:migrate');
    }

    const tables = (await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables where table_schema = 'public'
    `).map((t) => t.table_name);

    const want = ['members','sessions','login_tokens','terms','officer_roles','posts','events',
      'contact_messages','audit_log','settings','dues_charges','payments',
      'adjustments','funds','donors','donations','ticket_orders','rsvps',
      'status_change_requests','import_batches','ledger_entries'];
    const absent = want.filter((t) => !tables.includes(t));
    if (!absent.length) ok(`all ${want.length} tables present`);
    else bad(`tables missing: ${absent.join(', ')}`, 'npm run db:migrate');

    // The invariant that matters most: no stored balance anywhere.
    const balCols = await sql<{ table_name: string; column_name: string }[]>`
      select table_name, column_name from information_schema.columns
      where table_schema='public' and column_name in ('balance','balance_cents','amount_owed')
    `;
    if (!balCols.length) ok('no stored balance column (balances stay derived)');
    else bad(`stored balance found: ${balCols.map((c) => c.table_name + '.' + c.column_name).join(', ')}`,
             'Delete it. A stored balance goes wrong the first time anyone backdates a payment.');

    // ── content readiness ──
    head('Content');
    const [{ n: admins }] = await sql<any[]>`select count(*)::text n from members where role='admin' and status='active'`;
    if (Number(admins) === 0) bad('no active admin', 'npm run db:admin -- your@email.com');
    else if (Number(admins) === 1) meh('only one admin',
      'If they lose access nobody can approve members. Promote a second person from /admin/members.');
    else ok(`${admins} admins`);

    const [{ n: curTerms }] = await sql<any[]>`select count(*)::text n from terms where is_current`;
    if (Number(curTerms) === 1) ok('exactly one current term');
    else bad(`${curTerms} terms marked current`, 'Exactly one term must have is_current = true.');

    const [term] = await sql<any[]>`select * from terms where is_current`;
    if (term) {
      console.log(`  ${dim('current term: ' + term.name + ', dues $' + (term.dues_cents/100).toFixed(2))}`);
      if (!term.dues_assessed_at) meh('dues not assessed for this term', 'Do it at /admin/dues');
      else ok('dues assessed for this term');
    }

    const [{ n: officers }] = await sql<any[]>`
      select count(*)::text n from officer_roles o join terms t on t.id=o.term_id where t.is_current`;
    if (Number(officers) === 0) meh('no e-board for this term', '/eboard will show an empty state. Add them at /admin/eboard.');
    else ok(`${officers} officers listed`);

    const [{ n: funds }] = await sql<any[]>`select count(*)::text n from funds`;
    if (Number(funds) >= 2) ok(`${funds} funds`);
    else bad('General and Dues Assistance funds are missing', 'npm run db:migrate');

    // ── the arithmetic ──
    head('Money');
    const bad1 = await sql<any[]>`
      select m.full_name, m.member_type from dues_charges dc
      join members m on m.id=dc.member_id where m.member_type <> 'student' limit 5`;
    if (!bad1.length) ok('only students are charged dues');
    else bad(`non-students have charges: ${bad1.map((x:any)=>x.full_name+' ('+x.member_type+')').join(', ')}`);

    const orphanPay = await sql<any[]>`
      select count(*)::text n from payments p
      where not exists (select 1 from members m where m.id = p.member_id)`;
    if (Number(orphanPay[0].n) === 0) ok('every payment points at a real member');
    else bad(`${orphanPay[0].n} payments have no member`);

    const drift = await sql<any[]>`
      select count(*)::text n from payments p
      where p.method <> 'fund'
        and not exists (select 1 from ledger_entries le
                        where le.source_type='payment' and le.source_id=p.id)`;
    if (Number(drift[0].n) === 0) ok('every payment has a matching ledger entry');
    else bad(`${drift[0].n} payments are missing ledger entries — the ledger is understating income`);

    const dDrift = await sql<any[]>`
      select count(*)::text n from donations d
      where not d.is_in_kind
        and not exists (select 1 from ledger_entries le
                        where le.source_type='donation' and le.source_id=d.id)`;
    if (Number(dDrift[0].n) === 0) ok('every cash donation has a ledger entry');
    else bad(`${dDrift[0].n} donations missing from the ledger`);

    const inKind = await sql<any[]>`
      select count(*)::text n from ledger_entries le
      join donations d on d.id = le.source_id
      where le.source_type='donation' and d.is_in_kind`;
    if (Number(inKind[0].n) === 0) ok('in-kind gifts stay out of the cash ledger');
    else bad(`${inKind[0].n} in-kind gifts are counted as cash — funds look richer than they are`);

    const negFund = await sql<any[]>`
      select f.name, (coalesce((select sum(amount_cents) from donations d
                                where d.fund_id=f.id and not d.is_in_kind),0)
                      - coalesce((select sum(amount_cents) from ledger_entries le
                                  where le.fund_id=f.id and le.direction='out'),0)) bal
      from funds f`;
    const over = negFund.filter((f: any) => Number(f.bal) < 0);
    if (!over.length) ok('no fund is overdrawn');
    else bad(`overdrawn: ${over.map((f:any)=>f.name).join(', ')}`);

    // ── what is waiting for a human ──
    head('Waiting for attention');
    const q = async (s: string, sqlq: any) => {
      const [{ n }] = await sqlq;
      if (Number(n) > 0) console.log(`  ${y('•')} ${n} ${s}`);
      return Number(n);
    };
    const anything =
      (await q('members pending approval  → /admin/approvals',
        sql`select count(*)::text n from members where status='pending'`)) +
      (await q('status requests           → /admin/requests',
        sql`select count(*)::text n from status_change_requests where decided_at is null`)) +
      (await q('donations not yet thanked → /admin/donations',
        sql`select count(*)::text n from donations where acknowledged_at is null`)) +
      (await q('members owing money       → /admin/dues',
        sql`select count(*)::text n from (
              select m.id from members m
              where (coalesce((select sum(amount_cents) from dues_charges where member_id=m.id),0)
                   - coalesce((select sum(amount_cents) from payments    where member_id=m.id),0)
                   - coalesce((select sum(amount_cents) from adjustments where member_id=m.id),0)) > 0
            ) x`)) +
      (await q('unread contact messages',
        sql`select count(*)::text n from contact_messages where not handled`));
    if (!anything) console.log(`  ${dim('nothing outstanding')}`);
  }

  // ══════════════════════ summary ══════════════════════
  console.log(`\n${'─'.repeat(58)}`);
  console.log(`  ${g(pass + ' passed')}   ${warn ? y(warn + ' to note') : dim('0 to note')}   ${fail ? r(fail + ' failed') : dim('0 failed')}`);
  if (fail) {
    console.log(`\n\x1b[1mFix these:\x1b[0m`);
    Array.from(new Set(fixes)).forEach((f) => console.log(`  · ${f}`));
  } else {
    console.log(`\n  ${g('Phase 1 and Phase 2 are complete and wired up.')}`);
  }
  console.log('');

  await sql.end();
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => { console.error(e); await sql.end(); process.exit(1); });
