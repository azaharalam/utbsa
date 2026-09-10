import './env';
import { sendMail } from '../lib/mail';

/**
 * Send one email and say plainly what happened.
 *
 *   npm run mail:test -- you@example.com
 *
 * The point is to separate "the mail settings are wrong" from "the app is
 * wrong", which is otherwise a guessing game — a failed send inside the app
 * looks the same as half a dozen other problems.
 */

const to = process.argv[2];

const c = {
  ok: (s: string) => `\x1b[32m${s}\x1b[0m`,
  bad: (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  b: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

async function main() {
  console.log(`\n${c.b('Mail check')}\n`);

  const transport = process.env.MAIL_TRANSPORT ?? 'console';
  console.log(`  MAIL_TRANSPORT  ${transport}`);
  console.log(`  SMTP_HOST       ${process.env.SMTP_HOST ?? c.dim('(unset)')}`);
  console.log(`  SMTP_PORT       ${process.env.SMTP_PORT ?? c.dim('(unset)')}`);
  console.log(`  SMTP_USER       ${process.env.SMTP_USER
    ? process.env.SMTP_USER.slice(0, 8) + '…' : c.dim('(unset)')}`);
  console.log(`  SMTP_PASS       ${process.env.SMTP_PASS ? c.dim('set') : c.dim('(unset)')}`);
  console.log(`  MAIL_FROM       ${process.env.MAIL_FROM ?? c.dim('(unset — will use the fallback)')}`);
  console.log(`  SITE_URL        ${process.env.NEXT_PUBLIC_SITE_URL ?? c.dim('(unset)')}`);
  if (process.env.MAIL_REDIRECT_TO) {
    console.log(`  ${c.bad('MAIL_REDIRECT_TO')}  ${process.env.MAIL_REDIRECT_TO}`);
    console.log(`  ${c.dim('  everything goes there instead — correct on staging, wrong in production')}`);
  }
  console.log();

  if (transport !== 'smtp') {
    console.log(`  ${c.dim('Printing to the terminal rather than sending.')}`);
    console.log(`  ${c.dim('Set MAIL_TRANSPORT=smtp to send for real.')}\n`);
  }

  if (!to) {
    console.log(`  ${c.bad('Give me an address:')}  npm run mail:test -- you@example.com\n`);
    process.exit(1);
  }

  console.log(`  Sending to ${c.b(to)} …\n`);

  try {
    await sendMail({
      to,
      subject: 'UTBSA — mail check',
      text: `If you are reading this, sending works.\n\n`
          + `  transport: ${transport}\n`
          + `  from:      ${process.env.MAIL_FROM ?? '(fallback)'}\n`
          + `  sent:      ${new Date().toISOString()}\n\n`
          + `Worth checking: did it land in the inbox or in spam? A new domain has `
          + `no sending reputation, and spam is where a sign-in link goes to die.\n\n`
          + `— UTBSA`,
    });

    console.log(`  ${c.ok('✓ accepted by the mail server')}\n`);
    console.log(`  ${c.dim('Accepted is not the same as delivered. Check the inbox,')}`);
    console.log(`  ${c.dim('and check spam — that is where a new domain usually lands.')}\n`);
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    console.log(`  ${c.bad('✗ ' + msg.split('\n')[0])}\n`);

    // The four failures worth naming, because the raw error does not explain them.
    if (/Email address is not verified/i.test(msg)) {
      console.log(`  ${c.b('SES is still in the sandbox.')}`);
      console.log(`  Only verified addresses can receive. Either verify ${to} at`);
      console.log(`  SES → Identities → Create identity → Email address, or wait for`);
      console.log(`  production access.\n`);
    } else if (/535|authentication|credentials/i.test(msg)) {
      console.log(`  ${c.b('The username or password is wrong.')}`);
      console.log(`  SMTP credentials are not AWS access keys — they come from`);
      console.log(`  SES → SMTP settings → Create IAM credentials.\n`);
    } else if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|timeout|timed out|greeting never/i.test(msg)) {
      console.log(`  ${c.b('Could not reach the server.')}`);
      console.log(`  Check SMTP_HOST and the region, and that port 587 is not blocked`);
      console.log(`  by your network.\n`);
    } else if (/MessageRejected|not authorized|Domain/i.test(msg)) {
      console.log(`  ${c.b('The From address is not one SES will send for.')}`);
      console.log(`  MAIL_FROM must use a verified domain — yours is utoledobsa.org.\n`);
    }
    process.exit(1);
  }
}

main();
