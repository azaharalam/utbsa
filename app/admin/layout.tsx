import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { permissionsFor, heldOffices } from '@/lib/permissions';
import PortalNav from '@/components/portal-nav';
import UserMenu from '@/components/user-menu';
import AppFooter from '@/components/app-footer';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const perms = await permissionsFor(me.id);
  const offices = await heldOffices(me.id);
  const has = (p: string) => perms.includes(p as any);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Dark header, on purpose — so nobody confuses admin with the public site. */}
      <header className="bg-nil">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-baseline gap-2 font-display text-xl font-extrabold text-white">
            UTBSA <span className="text-[13px] font-semibold text-genda">admin</span>
          </Link>
          <div className="ml-auto">
            <UserMenu name={me.full_name} photoUrl={me.photo_url}
              isOfficer surface="admin"
              officeTitle={offices.map((o) => o.title).join(' and ') || null} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row">
        <PortalNav
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/finances', label: 'Finances' },
            ...(has('members') ? [
              { href: '/admin/approvals', label: 'Approvals' },
              { href: '/admin/members', label: 'Members' },
              { href: '/admin/requests', label: 'Status changes' },
              { href: '/admin/messages', label: 'Messages' },
              { href: '/admin/arrivals', label: 'Arrivals' },
            ] : []),
            ...(has('money') ? [
              { href: '/admin/dues', label: 'Dues' },
              { href: '/admin/claims', label: 'Transfers' },
              { href: '/admin/donations', label: 'Donations' },
              { href: '/admin/funds', label: 'Funds' },
              { href: '/admin/ledger', label: 'Ledger' },
              { href: '/admin/sponsors', label: 'Sponsors' },
            ] : []),
            ...(has('content') ? [{ href: '/admin/posts', label: 'Posts' }] : []),
            ...(has('events') ? [{ href: '/admin/events', label: 'Events' }] : []),
            ...(has('elections') ? [{ href: '/admin/elections', label: 'Elections' }] : []),
            { href: '/admin/offices', label: 'Offices' },
            ...(has('roles') ? [
              { href: '/admin/activity', label: 'Activity' },
              { href: '/admin/settings', label: 'Settings' },
            ] : []),
          ]}
        />
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </div>

      <AppFooter />
    </div>
  );
}
