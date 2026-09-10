import Link from 'next/link';
import { requireApproved } from '@/lib/session';
import { hasAnyAdminAccess, heldOffices } from '@/lib/permissions';
import PortalNav from '@/components/portal-nav';
import UserMenu from '@/components/user-menu';
import AppFooter from '@/components/app-footer';


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
  const isOfficer = await hasAnyAdminAccess(me.id);
  const offices = await heldOffices(me.id);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-2 border-dashed border-stitch bg-muslin">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-baseline gap-2 font-display text-xl font-extrabold text-nil">
            UTBSA <span className="text-[13px] font-semibold text-kantha">ইউটিবিএসএ</span>
          </Link>
          <Link href="/" className="hidden text-sm text-ink-mid hover:text-nil sm:block">Public site</Link>
          <div className="ml-auto">
            <UserMenu name={me.full_name} photoUrl={me.photo_url}
              isOfficer={isOfficer} surface="portal"
              officeTitle={offices[0]?.title ?? null} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row">
        <PortalNav
          items={[
            { href: '/portal', label: 'Dashboard' },
            { href: '/portal/events', label: 'Events' },
            { href: '/portal/dues', label: 'My dues' },
            { href: '/portal/election', label: 'Election' },
            { href: '/portal/arrivals', label: 'Arrivals' },
            { href: '/portal/giveaway', label: 'Giveaway' },
            { href: '/portal/housing', label: 'Housing' },
            { href: '/portal/jobs', label: 'Jobs' },
            { href: '/portal/profile', label: 'My profile' },
            { href: '/portal/directory', label: 'Directory' },
          ]}
        />
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </div>

      <AppFooter />
    </div>
  );
}
