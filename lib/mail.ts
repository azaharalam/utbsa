import nodemailer from 'nodemailer';

/**
 * In development MAIL_TRANSPORT=console prints the email to your terminal.
 * That means you can test the whole magic-link flow with no email provider
 * at all — copy the link out of the terminal and paste it in the browser.
 */
const transport =
  process.env.MAIL_TRANSPORT === 'smtp'
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
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

export function approvalEmail(name: string) {
  return {
    subject: 'You are in — UTBSA',
    text: `Assalamu alaikum ${name},\n\nYour UTBSA membership has been approved. Sign in here:\n\n${site()}/auth/login\n\nTake a minute to fill in your profile so other members can find you.`,
  };
}
