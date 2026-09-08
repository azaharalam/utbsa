import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="mt-16 bg-nil px-4 py-8 text-sm text-[#8EA1BD] sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-base font-bold text-white">UTBSA</p>
          <p>Bangladeshi Students Association · University of Toledo</p>
          <p className="mt-1">utbsa@example.org</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/about" className="hover:text-white">About</Link>
          <Link href="/eboard" className="hover:text-white">E-board</Link>
          <Link href="/events" className="hover:text-white">Events</Link>
          <Link href="/arrive" className="hover:text-white">Arriving</Link>
          <Link href="/blog" className="hover:text-white">Blog</Link>
          <Link href="/sponsors" className="hover:text-white">Sponsors</Link>
          <Link href="/join" className="hover:text-white">Join</Link>
          <Link href="/auth/login" className="hover:text-white">Sign in</Link>
        </nav>
      </div>
    </footer>
  );
}
