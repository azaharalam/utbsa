import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';
import { getCurrentMember } from '@/lib/session';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentMember();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader signedIn={!!me} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
