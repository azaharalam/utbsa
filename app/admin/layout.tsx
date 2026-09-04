import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import PortalNav from '@/components/portal-nav';
import { Avatar } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Dark header, on purpose — so nobody confuses admin with the public site. */}
      <header className="bg-nil">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-baseline gap-2 font-display text-xl font-extrabold text-white">
            UTBSA <span className="text-[13px] font-semibold text-genda">admin</span>
          </Link>
          <Link href="/portal" className="hidden text-sm text-[#A9BBD6] hover:text-white sm:block">
            Member portal
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-[#A9BBD6] sm:block">{me.full_name}</span>
            <Avatar name={me.full_name} url={me.photo_url} size={34} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row">
        <PortalNav
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/approvals', label: 'Approvals' },
            { href: '/admin/members', label: 'Members' },
            { href: '/admin/posts', label: 'Posts' },
            { href: '/admin/events', label: 'Events' },
            { href: '/admin/eboard', label: 'E-board' },
          ]}
        />
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </div>
    </div>
  );
}
