import { signOut } from '@/app/actions/auth';

export default function SignOutButton({ className = '' }: { className?: string }) {
  return (
    <form action={signOut}>
      <button type="submit" className={className || 'text-sm text-ink-mid hover:text-alta'}>
        Sign out
      </button>
    </form>
  );
}
