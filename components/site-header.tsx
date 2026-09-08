'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/eboard', label: 'E-board' },
  { href: '/events', label: 'Events' },
  { href: '/arrive', label: 'Arriving' },
  { href: '/blog', label: 'Blog' },
  { href: '/sponsors', label: 'Sponsors' },
  { href: '/contact', label: 'Contact' },
];

export default function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b-2 border-dashed border-stitch bg-muslin/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
        <Link href="/" className="mr-auto flex items-baseline gap-2 font-display text-xl font-extrabold text-nil">
          UTBSA <span className="text-[13px] font-semibold text-kantha">ইউটিবিএসএ</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm ${path === l.href ? 'font-semibold text-nil shadow-[0_2px_0_#E4A32B]' : 'text-ink-mid hover:text-nil'}`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={signedIn ? '/portal' : '/join'}
            className="rounded-lg bg-kantha px-4 py-2 text-sm font-semibold text-white"
          >
            {signedIn ? 'Portal' : 'Join'}
          </Link>
        </nav>

        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Menu"
          className="grid h-11 w-11 place-items-center rounded-lg border border-stitch md:hidden"
        >
          <span className="text-lg leading-none">{open ? '✕' : '☰'}</span>
        </button>
      </div>

      {open && (
        <nav className="border-t-2 border-dashed border-stitch bg-muslin px-4 pb-4 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block border-b border-muslin-deep py-3 text-base ${path === l.href ? 'font-semibold text-nil' : 'text-ink-mid'}`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={signedIn ? '/portal' : '/join'}
            onClick={() => setOpen(false)}
            className="mt-4 block rounded-lg bg-kantha px-4 py-3 text-center text-sm font-semibold text-white"
          >
            {signedIn ? 'Go to portal' : 'Join UTBSA'}
          </Link>
        </nav>
      )}
    </header>
  );
}
