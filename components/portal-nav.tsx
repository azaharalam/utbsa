'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PortalNav({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const path = usePathname();
  return (
    <nav
      className="flex gap-2 overflow-x-auto border-b-2 border-dashed border-stitch bg-muslin-deep p-3
                 md:w-52 md:shrink-0 md:flex-col md:overflow-visible md:border-b-0 md:border-r-2 md:p-4"
    >
      {items.map((i) => {
        const active = path === i.href;
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
              active ? 'bg-nil font-semibold text-white' : 'text-ink-mid hover:bg-white/60'
            }`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
