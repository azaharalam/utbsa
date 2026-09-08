'use client';

import { useState } from 'react';
import { googleCalendarUrl, outlookCalendarUrl, type CalendarEvent } from '@/lib/calendar';

/**
 * Three routes, because the platforms genuinely differ: Google and Outlook
 * take a URL, Apple Calendar wants a downloaded file. Offering only one
 * leaves half the members unable to use it.
 */
export default function AddToCalendar({
  event, slug,
}: {
  event: CalendarEvent; slug: string;
}) {
  const [open, setOpen] = useState(false);

  const options = [
    { label: 'Google Calendar', href: googleCalendarUrl(event), external: true },
    { label: 'Outlook', href: outlookCalendarUrl(event), external: true },
    { label: 'Apple Calendar or download', href: `/events/${slug}/calendar`, external: false },
  ];

  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(!open)}
        className="min-h-[40px] rounded-lg border-[1.5px] border-nil px-3 text-sm font-semibold text-nil">
        Add to calendar
      </button>

      {open && (
        <>
          {/* Click anywhere else to dismiss. */}
          <button aria-hidden tabIndex={-1} onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default" />
          <div className="absolute left-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border-2 border-dashed border-stitch bg-white shadow-lg">
            {options.map((o) => (
              <a key={o.label} href={o.href}
                target={o.external ? '_blank' : undefined}
                rel={o.external ? 'noopener noreferrer' : undefined}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 text-sm hover:bg-kantha-pale hover:text-kantha">
                {o.label}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
