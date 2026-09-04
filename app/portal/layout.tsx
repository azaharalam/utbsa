import Link from 'next/link';
import { requireApproved } from '@/lib/session';
import PortalNav from '@/components/portal-nav';
import SignOutButton from '@/components/sign-out';
import { Avatar } from '@/components/ui';

export const dynamic = 'force-dynamic';

/**
 * The route guard.
 *
 * With Supabase this lived in middleware. Middleware runs on the Edge runtime,
 * which cannot open a Postgres connection, so the check belongs here instead —
 * which is arguably the better place anyway: it is next to the pages it
 * protects, and every child page inherits it.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const me = await requireApproved();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-2 border-dashed border-stitch bg-muslin">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-baseline gap-2 font-display text-xl font-extrabold text-nil">
            UTBSA <span className="text-[13px] font-semibold text-kantha">ইউটিবিএসএ</span>
          </Link>
          <Link href="/" className="hidden text-sm text-ink-mid hover:text-nil sm:block">Public site</Link>
          <div className="ml-auto flex items-center gap-3">
            {me.role === 'admin' && (
              <Link href="/admin" className="rounded-lg bg-nil px-3 py-1.5 text-xs font-semibold text-white">
                Admin
              </Link>
            )}
            <span className="hidden text-sm text-ink-mid sm:block">{me.full_name}</span>
            <Avatar name={me.full_name} url={me.photo_url} size={34} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row">
        <PortalNav
          items={[
            { href: '/portal', label: 'Dashboard' },
            { href: '/portal/profile', label: 'My profile' },
            { href: '/portal/directory', label: 'Directory' },
          ]}
        />
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </div>

      <div className="border-t-2 border-dashed border-stitch px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl"><SignOutButton /></div>
      </div>
    </div>
  );
}
