'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut } from '@/app/actions/auth';
import { Avatar } from '@/components/ui';

/**
 * One place for everything about "you".
 *
 * Before this, signing out lived in a footer, the cross-link between admin and
 * portal sat in a header, and the avatar was decoration. Three related things
 * in three unrelated places. They all belong behind the picture of your face,
 * which is where people look for them.
 *
 * The cross-link is contextual: from the portal it offers the admin area, from
 * admin it offers the way back. Offering the surface you are already on would
 * be noise.
 */
export default function UserMenu({
  name, photoUrl, isOfficer, surface, officeTitle,
}: {
  name: string;
  photoUrl: string | null;
  isOfficer: boolean;
  surface: 'portal' | 'admin' | 'public';
  officeTitle?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape — a menu that traps you is worse
  // than no menu.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const dark = surface === 'admin';

  /**
   * The menu offers where you are NOT. Listing the surface you are already on
   * is noise, and it is the commonest way a menu like this gets cluttered.
   */
  const links = [
    { href: '/portal/profile', label: 'My profile' },
    ...(surface !== 'portal' ? [{ href: '/portal', label: 'Member portal' }] : []),
    ...(isOfficer && surface !== 'admin' ? [{ href: '/admin', label: 'Admin' }] : []),
    ...(surface !== 'public' ? [{ href: '/', label: 'Public site' }] : []),
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        aria-haspopup="menu" aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        className={`flex items-center gap-2 rounded-full p-0.5 transition-opacity hover:opacity-80 ${
          open ? 'ring-2 ring-kantha' : ''}`}>
        <Avatar name={name} url={photoUrl} size={34} />
      </button>

      {open && (
        <div role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border-2 border-dashed border-stitch bg-white shadow-lg">
          <div className="border-b border-muslin-deep px-4 py-3">
            <p className="truncate font-display text-sm font-bold">{name}</p>
            {officeTitle && <p className="truncate text-xs text-kantha">{officeTitle}</p>}
          </div>

          {links.map((l) => (
            <Link key={l.href} href={l.href} role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm hover:bg-kantha-pale hover:text-kantha">
              {l.label}
            </Link>
          ))}

          <form action={signOut} className="border-t border-muslin-deep">
            <button type="submit" role="menuitem"
              className="w-full px-4 py-2.5 text-left text-sm text-ink-mid hover:bg-muslin hover:text-alta">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
