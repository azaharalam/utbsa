/**
 * Checks that Phase 1 and Phase 2 are actually complete and wired up.
 *
 *   npm run doctor
 *
 * Reads only. Never writes to the database or edits a file.
 * Every failure prints the exact fix.
 */
import './env';
import { readFileSync, existsSync, readdirSync, lstatSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

/** Every file under a directory, for whole-tree greps. */
function walk(dir: string): string[] {
  const out: string[] = [];
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) out.push(...walk(full));
      else out.push(full);
    }
  } catch { /* directory may not exist */ }
  return out;
}

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

/**
 * A failing check must never take the whole report down. If a migration has
 * not run, the checks that depend on it should say so and the other forty
 * should still tell you what they know.
 */
async function check(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    if (/column .* does not exist|relation .* does not exist/.test(msg)) {
      bad(`${label}: the schema is behind`, 'npm run db:migrate');
    } else {
      bad(`${label}: ${msg.split('\n')[0]}`);
    }
  }
}

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
    ['lib/queries/claims.ts', 'transfer claims'],
    ['lib/queries/elections.ts', 'elections'],
    ['lib/queries/offices.ts', 'offices and handover'],
    ['lib/queries/inbox.ts', 'messages and activity log'],
    ['lib/queries/community.ts', 'arrivals, giveaway, housing, jobs'],
    ['lib/permissions.ts', 'permission model'],
    ['lib/sessions.ts', 'academic sessions'],
    ['lib/emails.ts', 'two-address login'],
    ['lib/sponsors.ts', 'sponsor tiers'],
    ['lib/potluck.ts', 'potluck categories'],
    ['lib/queries/potluck.ts', 'potluck items'],
    ['lib/queries/households.ts', 'household linking'],
    ['lib/queries/pulse.ts', 'community activity feed'],
    ['lib/queries/overview.ts', 'admin overview'],
    ['components/money/form-result.tsx', 'form success behaviour'],
    ['lib/audit-display.ts', 'audit diff formatting'],
    ['lib/calendar.ts', 'calendar links'],
    ['lib/bulk-mail.ts', 'resilient batch sending'],
    ['scripts/make-officer.ts', 'first-officer bootstrap'],
    ['components/user-menu.tsx', 'account menu'],
    ['components/app-footer.tsx', 'in-app footer'],
    ['lib/queries/sponsors.ts', 'sponsors and financial summary'],
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
    ['app/portal/events/page.tsx', 'member events tab'],
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
    ['app/admin/claims/page.tsx', 'transfers'],
    ['app/admin/elections/page.tsx', 'elections'],
    ['app/admin/offices/page.tsx', 'offices'],
    ['app/admin/messages/page.tsx', 'contact inbox'],
    ['app/admin/activity/page.tsx', 'activity log'],
    ['app/admin/arrivals/page.tsx', 'arrivals admin'],
    ['app/events/[slug]/calendar/route.ts', 'ics download'],
    ['app/admin/sponsors/page.tsx', 'sponsor management'],
    ['app/admin/finances/page.tsx', 'financial summary'],
    ['app/(site)/sponsors/page.tsx', 'public sponsors page'],
    ['app/(site)/arrive/page.tsx', 'public arrival form'],
    ['app/portal/arrivals/page.tsx', 'volunteer board'],
    ['app/portal/giveaway/page.tsx', 'giveaway board'],
    ['app/portal/housing/page.tsx', 'housing board'],
    ['app/portal/jobs/page.tsx', 'job board'],
    ['app/admin/events/[id]/page.tsx', 'event detail and check-in'],
    ['app/portal/election/page.tsx', 'member election page'],
    ['app/pay/[token]/page.tsx', 'claim link landing page'],
  ];
  missing = 0;
  for (const [f, what] of pages) if (!existsSync(join(root, f))) { bad(`${f} missing — ${what}`); missing++; }
  if (!missing) ok(`all ${pages.length} pages present`);

  // ══════════════════════ wiring ══════════════════════
  head('Wiring');
  const adminNav = read('app/admin/layout.tsx') ?? '';
  for (const [href, label] of [
    ['/admin/dues', 'Dues'], ['/admin/claims', 'Transfers'],
    ['/admin/messages', 'Messages'], ['/admin/activity', 'Activity'],
    ['/admin/arrivals', 'Arrivals'],
    ['/admin/donations', 'Donations'], ['/admin/funds', 'Funds'],
    ['/admin/ledger', 'Ledger'], ['/admin/requests', 'Status changes'],
    ['/admin/settings', 'Settings'],
  ]) {
    if (adminNav.includes(href)) ok(`admin nav has ${label}`);
    else bad(`admin nav is missing ${label}`, `Add { href: '${href}', label: '${label}' } to app/admin/layout.tsx`);
  }

  const portalNav = read('app/portal/layout.tsx') ?? '';
  if (portalNav.includes('/portal/events')) ok('portal nav has Events');
  else bad('portal nav is missing Events', "Add { href: '/portal/events', label: 'Events' }");

  if (portalNav.includes('/portal/dues')) ok('portal nav has My dues');
  else bad('portal nav is missing My dues', "Add { href: '/portal/dues', label: 'My dues' } to app/portal/layout.tsx");

  const evPage = read('app/(site)/events/[slug]/page.tsx') ?? '';
  if (evPage.includes('RsvpBox')) ok('event page shows the RSVP box');
  else bad('event page has no RSVP box', 'The RsvpBox patch did not apply to app/(site)/events/[slug]/page.tsx');

  const profForm = read('app/portal/profile/form.tsx') ?? '';
  if (profForm.includes('GraduateBox')) ok('profile has the graduation request');
  else bad('profile has no graduation request', 'The GraduateBox patch did not apply to app/portal/profile/form.tsx');

  const types = read('lib/types.ts') ?? '';
  if (types.includes('household_id')) ok('Member type has household_id (attendance only)');
  else bad('Member type is missing household_id',
           'Households drive RSVP now. Add "household_id: string | null;" to Member.');

  const findFn = (read('lib/queries/members.ts') ?? '');
  if (findFn.includes('lower(university_email)') && findFn.includes('lower(personal_email)')) {
    ok('either address signs a member in');
  } else {
    bad('findByEmail only matches one address',
        'A graduating member would be locked out when their UToledo account closes.');
  }

  if (types.includes('personal_email')) ok('Member type has personal_email');
  else bad('Member type is missing personal_email',
           'Add "personal_email: string | null;" to Member in lib/types.ts');

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
  // personal_email IS editable; the primary sign-in address is not.
  const leaked = ['role:', 'status:', '\n  email:'].filter((f) => selfEdit.includes(f));
  if (!leaked.length) ok('members cannot edit their own role, status, or sign-in email');
  else bad(`SelfEditable exposes ${leaked.join(', ')} — a member could promote themselves`);

  // The refactor that nearly shipped broken: page guards moved to permissions
  // while the query layer still checked members.role, so every officer who was
  // not also flagged 'admin' was locked out of their own pages.
  const queryFiles = [
    'lib/queries/dues.ts', 'lib/queries/donations.ts', 'lib/queries/ledger.ts',
    'lib/queries/claims.ts', 'lib/queries/members.ts', 'lib/queries/content.ts',
    'lib/queries/tickets.ts', 'lib/queries/settings.ts',
  ];
  const stale = queryFiles.filter((f) => (read(f) ?? '').includes("role !== 'admin'"));
  if (!stale.length) ok('query guards read the office, not an account flag');
  else bad(`these still check members.role: ${stale.join(', ')}`,
           'Officers who are not flagged admin will be refused by their own pages.');

  // Data captured with nowhere to read it is worse than not capturing it.
  const reachable: [string, string][] = [
    ['contact_messages', 'app/admin/messages/page.tsx'],
    ['audit_log', 'app/admin/activity/page.tsx'],
    ['rsvps', 'app/admin/events/[id]/page.tsx'],
    ['ticket_orders', 'app/admin/events/[id]/tickets.tsx'],
  ];
  const unreadable = reachable.filter(([, page]) => !existsSync(join(root, page)));
  if (!unreadable.length) ok('every table the app writes to can be read somewhere');
  else bad(`captured but unreadable: ${unreadable.map(([t]) => t).join(', ')}`,
           'Data with no page to view it silently goes nowhere.');

  // Copy that promises a feature which has since shipped is worse than no
  // copy at all — members read it and stop looking.
  const stalePages = ['app/portal/page.tsx', 'app/(site)/events/[slug]/page.tsx'];
  const stalePromises = stalePages.filter((f) =>
    /RSVP coming|coming soon|RSVP is coming/i.test(read(f) ?? ''));
  if (!stalePromises.length) ok('no page promises a feature that already exists');
  else bad(`stale "coming soon" copy in ${stalePromises.join(', ')}`,
           'RSVP shipped in Phase 2 — members reading this will not look for it.');

  // The admin overview must not tell a Treasurer about member approvals —
  // they cannot act on it, so it is noise that trains people to ignore it.
  const adminHome = read('app/admin/page.tsx') ?? '';
  if (adminHome.includes("has('money')") && adminHome.includes("has('members')")) {
    ok('admin overview is filtered by permission');
  } else {
    bad('admin overview shows the same thing to every officer',
        'A Treasurer should not see the approval queue.');
  }
  if (adminHome.includes('QuickApprove')) ok('members can be approved from the overview');
  else bad('admin overview has no inline approve');

  // Signing out, your profile, and the way between admin and portal are all
  // "about you" — scattering them across a header and a footer means nobody
  // finds any of them.
  for (const [layout, surface] of [
    ['app/portal/layout.tsx', 'portal'], ['app/admin/layout.tsx', 'admin'],
  ] as [string, string][]) {
    const src = read(layout) ?? '';
    if (src.includes('UserMenu')) ok(`${surface}: account actions are in one menu`);
    else bad(`${surface} layout does not use UserMenu`,
             'Sign out and the profile link should live behind the avatar.');
  }

  const publicFooter = read('components/site-footer.tsx') ?? '';
  if (publicFooter.includes('ZenNpsi')) ok('public footer credits the developer');
  else bad('the public footer has no attribution');

  /**
   * The two ways a staging site does real damage: emailing real members, and
   * being mistaken for the live site.
   */
  if (process.env.STAGING === 'true') {
    if (process.env.MAIL_REDIRECT_TO || process.env.MAIL_TRANSPORT !== 'smtp') {
      ok('staging cannot email real members');
    } else {
      bad('STAGING is true but mail is live and unredirected',
          'Testing the dues reminder would email every member for real. '
          + 'Set MAIL_REDIRECT_TO in .env.production.');
    }

    if ((process.env.DATABASE_URL ?? '').includes('utbsa_staging')) {
      ok('staging is on its own database');
    } else {
      bad('STAGING is true but DATABASE_URL does not point at utbsa_staging',
          'Staging is writing to the production database.');
    }
  }

  // Never the other way round.
  if (process.env.NODE_ENV === 'production' && process.env.STAGING !== 'true'
      && process.env.MAIL_REDIRECT_TO) {
    bad('MAIL_REDIRECT_TO is set in production',
        'Every member email is going to one address instead of the member.');
  }

  // Things that only matter once it is a real site on a real domain.
  if (process.env.NODE_ENV === 'production') {
    const url = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    if (url.startsWith('https://')) ok('site URL is https');
    else bad(`NEXT_PUBLIC_SITE_URL is "${url}"`,
             'Every magic link is built from this. Wrong here means nobody can sign in.');

    if (process.env.MAIL_TRANSPORT === 'smtp') {
      ok('email is configured to send');
    } else {
      bad('MAIL_TRANSPORT is not smtp in production',
          'The site will work perfectly and nobody will receive anything.');
    }

    // DigitalOcean blocks the well-known submission ports on every Droplet.
    // SES also listens on 2587, Brevo on 2525.
    if (process.env.SMTP_PORT === '587' || process.env.SMTP_PORT === '465'
        || process.env.SMTP_PORT === '25') {
      meh(`SMTP_PORT is ${process.env.SMTP_PORT}`,
          'DigitalOcean blocks 25, 465 and 587 on all Droplets. '
          + 'Use 2587 for SES, or 2525 for Brevo.');
    }

    const upload = join(root, 'public', 'uploads');
    try {
      if (lstatSync(upload).isSymbolicLink()) ok('uploads survive a deploy');
      else meh('public/uploads is a real directory',
               'Member photos will be lost on the next deploy. See deploy/DEPLOY.md step 4.');
    } catch {
      meh('public/uploads does not exist yet', 'It is created on the first photo upload.');
    }
  }

  // Sign out, your profile, and the cross-link between surfaces are all
  // "about you" — they belong in one place, and the same place everywhere.
  const surfaces: [string, string][] = [
    ['app/(site)/layout.tsx', 'public'],
    ['app/portal/layout.tsx', 'portal'],
    ['app/admin/layout.tsx', 'admin'],
  ];
  const withoutMenu = surfaces
    .filter(([f]) => !(read(f) ?? '').includes('SiteHeader') || f !== 'app/(site)/layout.tsx'
      ? !/UserMenu|SiteHeader/.test(read(f) ?? '')
      : false)
    .map(([, name]) => name);
  if (!withoutMenu.length) ok('all three surfaces put "you" in the same corner');
  else bad(`no user menu on: ${withoutMenu.join(', ')}`);

  const menuSrc = read('components/user-menu.tsx') ?? '';
  if (menuSrc.includes("surface !== 'portal'") && menuSrc.includes("surface !== 'admin'")) {
    ok('the user menu offers the surface you are not on');
  } else {
    bad('the user menu may list the page you are already on');
  }

  // A form that discards its error state fails silently — the person clicks,
  // nothing happens, and there is nothing on screen to explain why.
  const clientFiles = walk(join(root, 'app'))
    .concat(walk(join(root, 'components')))
    .filter((f: string) => f.endsWith('.tsx'));
  const clientForms = clientFiles;
  const swallowing = clientForms.filter((f: string) => {
    const src = readFileSync(f, 'utf8');
    return /const \[\s*,\s*\w+\s*\]\s*=\s*useFormState/.test(src);
  }).map((f: string) => f.replace(root + '/', ''));
  if (!swallowing.length) ok('no form throws away its error state');
  else bad(`these forms discard errors: ${swallowing.join(', ')}`,
           'A failed action looks identical to a successful one.');

  // A server action that times out returns undefined. Reading .error off it
  // white-screens the whole page — a worse failure than the one that caused it.
  const unguarded = clientFiles.filter((f: string) => {
    const src = readFileSync(f, 'utf8');
    if (!src.includes('useFormState')) return false;
    return /\{\s*\w+State?\.(error|ok)\s/.test(src);
  }).map((f: string) => f.replace(root + '/', ''));
  if (!unguarded.length) ok('forms survive an action that returns nothing');
  else bad(`these read form state without optional chaining: ${unguarded.join(', ')}`,
           'A timed-out action white-screens the page. Use state?.error.');

  // Behind nginx the app sees 127.0.0.1:3001, so a redirect built from the
  // request origin sends people to localhost — with the token already spent.
  const verifySrc = read('app/auth/verify/route.ts') ?? '';
  if (verifySrc.includes('NEXT_PUBLIC_SITE_URL')) {
    ok('sign-in links redirect to the real address');
  } else {
    bad('the verify route builds redirects from the request origin',
        'Behind a proxy that is 127.0.0.1:3001, so the link lands nowhere.');
  }

  // SMTP without timeouts hangs the request until nginx gives up at 60s.
  const mailSrc = read('lib/mail.ts') ?? '';
  if (mailSrc.includes('connectionTimeout')) ok('a stalled mail server fails fast');
  else bad('SMTP has no timeouts',
           'An unreachable mail host hangs the request until nginx returns 504.');


  /**
   * Every form must resolve when it succeeds.
   *
   * Three ways to do it, and which one is right depends on whether the person
   * is about to do it again:
   *
   *   create  clear the fields  (ResetOnSuccess)
   *   edit    keep them, confirm (Confirmation)
   *   once    replace the form   (Done)
   *
   * A panel that expands to act counts as resolved if it closes
   * (useCloseOnSuccess), and an action that navigates away resolves itself.
   * A form of buttons only is resolved by the row it sits in changing.
   */
  const redirects = new Set<string>();
  for (const f of walk(join(root, 'app', 'actions'))) {
    const src = readFileSync(f, 'utf8');
    const decls = Array.from(src.matchAll(/export async function (\w+)\(/g));
    decls.forEach((m, i) => {
      const from = m.index ?? 0;
      const to = i + 1 < decls.length ? (decls[i + 1].index ?? src.length) : src.length;
      if (src.slice(from, to).includes('redirect(')) redirects.add(m[1]);
    });
  }

  const unresolved = clientFiles.filter((f: string) => {
    const src = readFileSync(f, 'utf8');
    if (!src.includes('useFormState') || !src.includes('<form action=')) return false;
    // Confirmation is the right answer for an edit form: the values stay,
    // because clearing them would look like the save had wiped everything.
    if (/ResetOnSuccess|useCloseOnSuccess|<Done|<Confirmation/.test(src)) return false;

    const used = Array.from(src.matchAll(/useFormState\((\w+)/g)).map((m: any) => m[1]);
    if (used.length > 0 && used.every((a) => redirects.has(a))) return false;

    const typed = /<(input|textarea)\b(?![^>]*type="hidden")/.test(src) || src.includes('<Field');
    return typed;
  }).map((f: string) => f.replace(root + '/', ''));

  if (!unresolved.length) ok('every form resolves when it succeeds');
  else bad(`these leave their fields filled: ${unresolved.join(', ')}`,
           'Pick one: ResetOnSuccess to clear, Confirmation to keep, Done to replace.');

  // A loop of awaits over sendMail aborts on the first failure, leaving the
  // sender with an error and no idea how many already went.
  const bulkSenders = clientFiles
    .concat(walk(join(root, 'app', 'actions')))
    .concat(walk(join(root, 'lib', 'queries')))
    .filter((f: string) => /\.tsx?$/.test(f) && !f.endsWith('bulk-mail.ts'));
  const naive = bulkSenders.filter((f: string) => {
    const src = readFileSync(f, 'utf8');
    return /for \([^)]*\bof\b[^)]*\)\s*\{[\s\S]{0,900}?await sendMail\(/.test(src);
  }).map((f: string) => f.replace(root + '/', ''));
  if (!naive.length) ok('batch email survives one bad address');
  else bad(`these loop over sendMail without catching: ${naive.join(', ')}`,
           'One failure aborts the batch, and the sender cannot tell how many went.');


  // The dashboard is the page members see most. If everything on it is a
  // link out, it is a menu, not a dashboard.
  const dash = read('app/portal/page.tsx') ?? '';
  const inline = ['QuickRsvp', 'QuickPotluck', 'QuickArrival']
    .filter((c) => dash.includes(c));
  if (inline.length === 3) ok('members can act from the dashboard without navigating');
  else bad(`dashboard is missing inline actions: ${['QuickRsvp','QuickPotluck','QuickArrival'].filter((c) => !dash.includes(c)).join(', ')}`);

  // The pulse must never surface anything a member kept private.
  const pulseSrc = read('lib/queries/pulse.ts') ?? '';
  if (pulseSrc.includes('m.in_directory')) ok('activity feed respects directory opt-out');
  else bad('activity feed may name members who opted out of the directory',
           'The joined query must filter on m.in_directory.');
  // Strip comments first — the file explains what it deliberately avoids,
  // and matching prose would flag it for saying so.
  const pulseCode = pulseSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  const pulseLeak = ['dues_charges', 'payments', 'adjustments', 'arrival_requests',
                     'amount_cents', 'ballots']
    .filter((t) => pulseCode.includes(t));
  if (!pulseLeak.length) ok('activity feed shows nothing financial or private');
  else bad(`activity feed touches ${pulseLeak.join(', ')}`);

  const perms = read('lib/permissions.ts') ?? '';
  if (perms.includes('PERMISSION_SETS')) ok('access derives from held office, not an account flag');
  else bad('lib/permissions.ts is missing the permission sets');

  // Developer instructions have no business on a page members see.
  const devLeaks = walk(join(root, 'app'))
    .filter((f: string) => f.endsWith('.tsx'))
    .filter((f: string) => {
      if (f.includes('/admin/')) return false;
      const src = readFileSync(f, 'utf8');
      return /MAIL_TRANSPORT=console|npm run dev/.test(src);
    })
    .map((f: string) => f.replace(root + '/', ''));
  if (!devLeaks.length) ok('no member-facing page mentions running it locally');
  else bad(`development instructions shown to members: ${Array.from(new Set(devLeaks)).join(', ')}`);


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
                     '004_money.sql', '005_drop_households.sql',
                     '006_payment_claims.sql', '007_elections.sql',
                     '008_sessions.sql', '009_inbox.sql', '010_arrivals.sql', '011_audit_role.sql', '012_emails.sql', '013_sponsors.sql', '014_households_potluck.sql', '015_audit_scope.sql', '016_audit_diff.sql', '017_donor_student.sql', '018_appeals.sql', '019_contact_personal.sql']) {
      if (applied.includes(m)) ok(`migration ${m}`);
      else bad(`migration ${m} has not run`, 'npm run db:migrate');
    }

    const tables = (await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables where table_schema = 'public'
    `).map((t) => t.table_name);

    const want = ['members','sessions','login_tokens','terms','officer_roles','posts','events',
      'contact_messages','audit_log','settings','dues_charges','payments',
      'adjustments','funds','donors','donations','ticket_orders','rsvps',
      'status_change_requests','import_batches','ledger_entries',
      'payment_claims','claim_tokens','elections','election_positions',
      'nominations','election_voters','ballots','ballot_choices',
      'arrival_requests','giveaway_items','housing_posts','job_posts',
      'households','household_invites','potluck_items'];
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

    const [{ session }] = await sql<{ session: string }[]>`
      select current_session as session from settings where id = 1`;
    const [{ n: officers }] = await sql<any[]>`
      select count(*)::text n from officer_roles
      where session = ${session} and ended_at is null and is_eboard`;
    console.log(`  ${dim('current session: ' + session)}`);
    if (Number(officers) === 0) meh(`no e-board for ${session}`,
      '/eboard will show an empty state. Assign offices at /admin/offices.');
    else ok(`${officers} officers serving ${session}`);

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

    // A confirmed claim must have produced a payment, or money was
    // acknowledged and never recorded.
    const orphanClaims = await sql<any[]>`
      select count(*)::text n from payment_claims
      where status = 'confirmed' and payment_id is null`;
    if (Number(orphanClaims[0].n) === 0) ok('every confirmed transfer created a payment');
    else bad(`${orphanClaims[0].n} confirmed transfers produced no payment`);

    // A pending claim must never have moved a balance.
    const earlyPay = await sql<any[]>`
      select count(*)::text n from payment_claims c
      join payments p on p.id = c.payment_id
      where c.status = 'pending'`;
    if (Number(earlyPay[0].n) === 0) ok('pending transfers have not touched any balance');
    else bad(`${earlyPay[0].n} pending transfers already created payments`);

    // BALLOT SECRECY. If a ballot ever gains a column that narrows it to a
    // person, the whole election design is void.
    const ballotCols = await sql<{ column_name: string; table_name: string }[]>`
      select table_name, column_name from information_schema.columns
      where table_name in ('ballots','ballot_choices')`;
    const leaky = ballotCols.filter((c) =>
      /member|user|voter|created_by|ip$|agent|email|session/i.test(c.column_name));
    if (!leaky.length) ok('ballots carry nothing that identifies a voter');
    else bad(`ballots expose ${leaky.map((c) => c.table_name + '.' + c.column_name).join(', ')} — VOTES ARE NOT SECRET`,
             'Drop that column. Who voted lives in election_voters; what was voted lives in ballots. They must never join.');

    // Every ballot should correspond to someone marked as having voted.
    const ballotMismatch = await sql<any[]>`
      select e.id, e.name,
        (select count(*) from ballots b where b.election_id = e.id)::int as ballots,
        (select count(*) from election_voters v
         where v.election_id = e.id and v.voted_at is not null)::int as voted
      from elections e where e.status in ('voting','closed')`;
    const off = ballotMismatch.filter((r: any) => r.ballots !== r.voted);
    if (!off.length) ok('ballot count matches the number of members recorded as voting');
    else bad(`mismatch in: ${off.map((r: any) => r.name).join(', ')}`);

    // The old db:admin set members.role, which grants nothing since 007.
    // Anyone flagged that way but holding no office has no access at all.
    const orphanAdmins = await sql<{ full_name: string }[]>`
      select m.full_name from members m
      where m.role = 'admin' and m.status = 'active'
        and not exists (
          select 1 from officer_roles o
          where o.member_id = m.id and o.ended_at is null
        )`;
    if (!orphanAdmins.length) ok('nobody is flagged admin without an office');
    else bad(`${orphanAdmins.map((r) => r.full_name).join(', ')} flagged admin but hold no office`,
             'members.role grants nothing since migration 007. '
             + 'npm run db:officer -- their@email "Title" full');

    // Nobody should be locked out of administering the site.
    const [{ n: fullOffices }] = await sql<{ n: string }[]>`
      select count(*)::text n from officer_roles
      where ended_at is null and permission_set = 'full'`;
    if (Number(fullOffices) >= 2) ok(`${fullOffices} offices hold full access`);
    else if (Number(fullOffices) === 1) meh('only one office has full access',
      'If that person loses access nobody can administer the site. President and General Secretary should both have it.');
    else bad('no office has full access — nobody can administer the site',
             'npm run db:admin -- your@email.com');

    // Anyone holding an office should be able to use it.
    const lockedOut = await sql<any[]>`
      select m.full_name, o.title from members m
      join officer_roles o on o.member_id = m.id and o.ended_at is null
      where m.status <> 'active' and o.permission_set <> 'none'`;
    if (!lockedOut.length) ok('every serving officer has an active membership');
    else bad(`inactive members hold office: ${lockedOut.map((r: any) => r.full_name + ' (' + r.title + ')').join(', ')}`);

    // Offices must be filed against a session, not a semester.
    const [{ n: noSession }] = await sql<{ n: string }[]>`
      select count(*)::text n from officer_roles where session is null`;
    if (Number(noSession) === 0) ok('every office is filed against a session');
    else bad(`${noSession} offices have no session`, 'npm run db:migrate');

    // The volunteer board must never leak a surname, phone, flight, or email —
    // an arrival request says where a stranger will be alone with luggage.
    const board = read('lib/queries/community.ts') ?? '';
    if (board.includes("split_part(a.full_name, ' ', 1)")) {
      ok('arrival board shows first names only');
    } else {
      bad('arrival board may be exposing full names',
          'arrivalBoard() must select split_part(full_name, \' \', 1), never the whole name.');
    }
    const leakFields = ['a.phone', 'a.flight_no', 'a.email'];
    const boardFn = board.slice(board.indexOf('export async function arrivalBoard'),
                                board.indexOf('export async function arrivalDetail'));
    const leaked2 = leakFields.filter((f) => boardFn.includes(f));
    if (!leaked2.length) ok('arrival board leaks no contact or flight details');
    else bad(`arrival board selects ${leaked2.join(', ')} — visible to every member`);

    // The log records the use of power. An officer RSVPing or linking their
    // household is acting as a member — the office is incidental.
    const [{ n: noise }] = await sql<{ n: string }[]>`
      select count(*)::text n from audit_log
      where action in ('auth.login','member.signup','household.invite','household.accept',
                       'household.leave','arrival.claim','arrival.release','arrival.done',
                       'rsvp.set','potluck.claim','giveaway.post','housing.post','job.post')`;
    if (Number(noise) === 0) ok('audit log holds only admin actions');
    else meh(`${noise} member-scope entries in the log`, 'npm run db:migrate applies the cleanup.');

    const auditSrc = read('lib/audit.ts') ?? '';
    if (auditSrc.includes('MEMBER_SCOPE')) ok('member-scope actions are filtered before writing');
    else bad('lib/audit.ts writes every action',
             'An officer using the member portal should not appear in the log.');

    if (auditSrc.includes('NEVER_LOG') && auditSrc.includes('token_hash')) {
      ok('token hashes are stripped before anything is logged');
    } else if (!auditSrc) {
      bad('lib/audit.ts is missing');
    } else {
      bad('the audit log may store token hashes',
          'Anyone with log access could impersonate a member. Apply the audit-diff bundle.');
    }

    // A log that says "changed a status" without the old value answers nothing.
    await check('audit diffs', async () => {
      const [{ n: noDiff }] = await sql<{ n: string }[]>`
        select count(*)::text n from audit_log
        where operation = 'update' and (changed is null or jsonb_array_length(changed) = 0)`;
      if (Number(noDiff) === 0) ok('every update in the log records what changed');
      else bad(`${noDiff} update entries have no diff`,
               'Use tracked() so the before and after are captured automatically.');

      const [{ n: leaked }] = await sql<{ n: string }[]>`
        select count(*)::text n from audit_log
        where before_data::text ilike '%token_hash%' or after_data::text ilike '%token_hash%'`;
      if (Number(leaked) === 0) ok('no stored diff contains a credential');
      else bad(`${leaked} log entries contain a token hash`);
    });

    // Without the snapshot, "which president approved that?" is unanswerable
    // once they hand over.
    const [{ n: roleless }] = await sql<{ n: string }[]>`
      select count(*)::text n from audit_log
      where actor_id is not null and actor_role is null
        and created_at > now() - interval '1 day'`;
    if (Number(roleless) === 0) ok('audit entries record the office held at the time');
    else bad(`${roleless} recent entries have no office recorded`,
             'lib/audit.ts must snapshot the actor\'s office when it writes.');

    // A rockets address in the `email` column means their sign-in link goes
    // somewhere the university quarantines — they simply cannot get in.
    const [{ n: writingToUniversity }] = await sql<{ n: string }[]>`
      select count(*)::text n from members
      where status = 'active' and personal_email is not null
        and lower(email) <> lower(personal_email)`;
    if (Number(writingToUniversity) === 0) ok('every member is written to at their personal address');
    else bad(`${writingToUniversity} members are written to at a non-personal address`,
             'The university quarantines mail from new domains, so their sign-in '
             + 'link never arrives. npm run db:migrate');

    // Students and alumni must be reachable after they leave.
    const unreachable = await sql<any[]>`
      select count(*)::text n from members
      where member_type in ('student','alumni') and status = 'active'
        and personal_email is null`;
    if (Number(unreachable[0].n) === 0) ok('every student and alum has a personal address');
    else meh(`${unreachable[0].n} students or alumni have no personal address`,
      'They become unreachable when their UToledo account closes. Signup now requires one.');

    const badDomain = await sql<any[]>`
      select count(*)::text n from members
      where university_email is not null and university_email not ilike '%utoledo.edu'`;
    if (Number(badDomain[0].n) === 0) ok('every university address is a utoledo.edu one');
    else bad(`${badDomain[0].n} university addresses are not utoledo.edu`);

    // Nobody is named publicly without agreeing to it.
    const [{ n: unconsented }] = await sql<{ n: string }[]>`
      select count(*)::text n from donors
      where show_publicly and is_anonymous`;
    if (Number(unconsented) === 0) ok('no anonymous donor is shown publicly');
    else bad(`${unconsented} anonymous donors are on the public page`,
             'A donor who asked to stay anonymous must never be listed.');

    // Households are for ATTENDANCE. If one ever leaks into dues, a couple
    // gets charged once instead of twice.
    const duesCols = await sql<{ table_name: string }[]>`
      select table_name from information_schema.columns
      where table_schema = 'public' and column_name = 'household_id'
        and table_name in ('dues_charges','payments','adjustments')`;
    if (!duesCols.length) ok('households do not touch dues');
    else bad(`household_id found on ${duesCols.map((c) => c.table_name).join(', ')}`,
             'Dues are per-student. A couple who both study owe twice.');

    // Two answers from one household means a double-counted headcount.
    const dupRsvp = await sql<any[]>`
      select count(*)::text n from (
        select event_id, household_id from rsvps
        where household_id is not null
        group by event_id, household_id having count(*) > 1
      ) x`;
    if (Number(dupRsvp[0].n) === 0) ok('one RSVP per household per event');
    else bad(`${dupRsvp[0].n} households answered twice for the same event`);

    // A dish claimed by two people is a dish nobody brings.
    const dupClaim = await sql<any[]>`
      select count(*)::text n from potluck_items
      where claimed_by is not null and claimed_at is null`;
    if (Number(dupClaim[0].n) === 0) ok('every claimed dish records when it was taken');
    else bad(`${dupClaim[0].n} potluck items are claimed with no timestamp`);

    // A dropdown that offers a value the database rejects fails only when
    // somebody picks that one option — often long after launch.
    const enumChecks: [string, string, string[]][] = [
      ['donors', 'donors_type_check',
        ['individual','student','alumni','faculty','university','business','organization']],
      ['members', 'members_member_type_check',
        ['student','alumni','faculty','spouse','community']],
      ['officer_roles', 'officer_roles_permission_set_check',
        ['full','money','members','content','events','none']],
    ];

    for (const [table, constraint, offered] of enumChecks) {
      const [row] = await sql<{ def: string | null }[]>`
        select pg_get_constraintdef(oid) as def from pg_constraint
        where conname = ${constraint}`;
      if (!row?.def) continue;
      const missing = offered.filter((v) => !row.def!.includes(`'${v}'`));
      if (!missing.length) ok(`${table}: every option the form offers is accepted`);
      else bad(`${table} rejects ${missing.join(', ')}`,
               `The form offers these but the check constraint refuses them — picking one errors.`);
    }

    // Someone turned down should still have a route back to a human.
    const pendingSrc = read('app/auth/pending/page.tsx') ?? '';
    if (pendingSrc.includes('Appeal')) ok('rejected members can ask to be reconsidered');
    else bad('a rejected member has no way to reply',
             'They can sign in and read the reason, but not respond to it.');

    const soon = await sql<any[]>`
      select count(*)::text n from arrival_requests
      where status = 'open' and arriving_on between current_date and current_date + 7`;
    if (Number(soon[0].n) > 0) meh(`${soon[0].n} arriving within a week with nobody assigned`,
      'Someone landing at Detroit with no lift is what this feature exists to prevent. /admin/arrivals');

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

// Even an unexpected failure should still print what was learned.
main().catch(async (e) => { console.error(e); await sql.end(); process.exit(1); });
