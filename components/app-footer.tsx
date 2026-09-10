import Link from 'next/link';

/**
 * A single line, for inside the app.
 *
 * The portal and the admin area do not need a marketing footer — someone who
 * is signed in already knows what UTBSA is. What is worth keeping is a way
 * back to the public site and the attribution, on one line, out of the way.
 */
export default function AppFooter({ dark = false }: { dark?: boolean }) {
  return (
    <footer className={`mt-12 border-t-2 border-dashed ${
      dark ? 'border-white/15' : 'border-stitch'}`}>
      <div className={`mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 text-xs sm:px-6 ${
        dark ? 'text-white/60' : 'text-ink-mid'}`}>
        <Link href="/" className="font-semibold hover:underline">
          UTBSA website
        </Link>
        <span>© {new Date().getFullYear()} University of Toledo Bangladeshi Students Association</span>
        <span className="ml-auto">Developed by ZenNpsi</span>
      </div>
    </footer>
  );
}
