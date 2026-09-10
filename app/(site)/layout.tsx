import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';
import { getCurrentMember } from '@/lib/session';
import { hasAnyAdminAccess } from '@/lib/permissions';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentMember();

  // Only approved members get the menu — someone still waiting has nothing
  // behind it, and offering it would imply they are in.
  const inside = me && ['active', 'inactive', 'alumni'].includes(me.status);
  const isOfficer = inside ? await hasAnyAdminAccess(me!.id) : false;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        signedIn={!!inside}
        user={inside
          ? { name: me!.full_name, photoUrl: me!.photo_url, isOfficer }
          : null}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
