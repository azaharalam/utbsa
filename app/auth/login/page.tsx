import LoginForm from './form';

export const metadata = { title: 'Sign in' };

/**
 * The verify route redirects here with ?error=... when a link fails. Landing
 * on a bare sign-in form after clicking a link you were told would work is
 * confusing — it looks like nothing happened.
 */
const REASONS: Record<string, string> = {
  expired:
    'That link has already been used, or it is more than 30 minutes old. '
    + 'Links work once, on purpose. Enter your address below and we will send a fresh one.',
  missing:
    'That link was incomplete — some email apps break long links across lines. '
    + 'Try copying the whole link, or request a new one below.',
  nouser:
    'We could not find an account for that address. If you have just signed up, '
    + 'use the link in your confirmation email instead.',
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const reason = searchParams.error ? REASONS[searchParams.error] : undefined;
  return <LoginForm reason={reason} />;
}
