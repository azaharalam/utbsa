import nodemailer from 'nodemailer';

/**
 * In development MAIL_TRANSPORT=console prints the email to your terminal.
 * That means you can test the whole magic-link flow with no email provider
 * at all — copy the link out of the terminal and paste it in the browser.
 */
/**
 * Timeouts matter more than they look.
 *
 * Without them, a blocked or unreachable SMTP host makes sendMail hang, which
 * hangs the server action, which hangs the request — until nginx gives up at
 * 60 seconds and returns a 504. The person sees a broken page and no
 * explanation, and the log says nothing useful.
 *
 * Ten seconds is far more than a healthy send needs, and turns a hang into a
 * clear error the form can show.
 */
const transport =
  process.env.MAIL_TRANSPORT === 'smtp'
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      })
    : null;

/**
 * ─────────────────────────────────────────────────────────────
 * THE STAGING SAFETY VALVE
 *
 * A staging site with real SMTP credentials can email the entire membership.
 * Testing the dues reminder once would send a hundred real people a real
 * email from a test system — and there is no way to recall it.
 *
 * So when MAIL_REDIRECT_TO is set, every message goes there instead,
 * whoever it was addressed to. The intended recipient is put in the subject
 * so the redirect is obvious rather than confusing.
 *
 * Set it on staging. Never set it in production.
 * ─────────────────────────────────────────────────────────────
 */
const redirectTo = process.env.MAIL_REDIRECT_TO?.trim() || null;

export async function sendMail(opts: { to: string; subject: string; text: string; html?: string }) {
  if (!transport) {
    console.log('\n' + '─'.repeat(72));
    console.log(`  EMAIL (not sent — MAIL_TRANSPORT is "console")`);
    console.log(`  To:      ${opts.to}`);
    console.log(`  Subject: ${opts.subject}`);
    console.log('─'.repeat(72));
    console.log(opts.text);
    console.log('─'.repeat(72) + '\n');
    return;
  }

  if (redirectTo) {
    await transport.sendMail({
      from: process.env.MAIL_FROM ?? 'UTBSA <noreply@utoledobsa.org>',
      to: redirectTo,
      subject: `[staging → ${opts.to}] ${opts.subject}`,
      text: `This message was addressed to ${opts.to} and redirected here `
          + `because MAIL_REDIRECT_TO is set.\n\n`
          + `${'─'.repeat(60)}\n\n${opts.text}`,
    });
    return;
  }

  await transport.sendMail({
    from: process.env.MAIL_FROM ?? 'UTBSA <noreply@utoledobsa.org>',
    ...opts,
  });
}

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export function magicLinkEmail(token: string, isSignup: boolean) {
  const url = `${site()}/auth/verify?token=${token}`;
  return {
    subject: isSignup ? 'Confirm your email — UTBSA' : 'Your sign-in link — UTBSA',
    text: isSignup
      ? `Welcome to UTBSA.\n\nConfirm your email address by opening this link:\n\n${url}\n\nIt works once and expires in 30 minutes.\n\nAfter you confirm, an e-board member will approve your membership — usually within a day.`
      : `Open this link to sign in to UTBSA:\n\n${url}\n\nIt works once and expires in 30 minutes. If you did not ask for it, you can ignore this email.`,
  };
}

/**
 * Somebody on the e-board put this person's details in by hand, usually from
 * a sign-up sheet at an event.
 *
 * The link both signs them in and lands them on their profile, because the
 * alternative is telling somebody who has never seen the site to find a page
 * on it. They did not ask for this account, so it says who added them and
 * what to do if that is a mistake.
 */
export function welcomeEmail(name: string, token: string, addedBy: string) {
  const url = `${site()}/auth/verify?token=${token}&next=profile`;
  return {
    subject: 'Your UTBSA account — UTBSA',
    text:
      `Hello ${name},\n\n`
      + `${addedBy} has set up a UTBSA account for you, using the details you `
      + `gave us. You do not need to sign up.\n\n`
      + `Open this link to finish your profile:\n\n${url}\n\n`
      + `It works once and expires in 30 minutes. If it has expired by the time `
      + `you get to it, go to ${site()}/auth/login and we will send another.\n\n`
      + `There is no password. Every time you sign in, we email you a link.\n\n`
      + `Your profile is where you add your department, your phone number, and `
      + `decide what other members can see. None of it is required.\n\n`
      + `If you did not expect this, reply and tell us and we will remove the `
      + `account.\n\n— UTBSA`,
  };
}

export function approvalEmail(name: string) {
  return {
    subject: 'You are in — UTBSA',
    text: `Hello ${name},\n\nYour UTBSA membership has been approved. Sign in here:\n\n${site()}/auth/login\n\nTake a minute to fill in your profile so other members can find you.`,
  };
}
