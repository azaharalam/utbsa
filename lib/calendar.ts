/**
 * Calendar links for an event.
 *
 * Two routes because the platforms differ: Google and Outlook take a URL,
 * while Apple Calendar and most desktop clients want a downloaded .ics file.
 * Offering only one leaves half the members unable to use it.
 *
 * Shared between server and client — nothing server-only here.
 */

export type CalendarEvent = {
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string | Date;
  endsAt?: string | Date | null;
  url?: string;
};

/** iCalendar wants YYYYMMDDTHHMMSSZ in UTC. */
function stamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Events with no end time get two hours, which is about right for a picnic. */
function endOf(e: CalendarEvent) {
  if (e.endsAt) return new Date(e.endsAt);
  return new Date(new Date(e.startsAt).getTime() + 2 * 60 * 60 * 1000);
}

/** Line breaks, commas, and semicolons all mean something in iCalendar. */
function esc(v: string) {
  return v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n')
          .replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function toIcs(e: CalendarEvent, uid: string): string {
  const start = new Date(e.startsAt);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UTBSA//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}@utbsa`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(endOf(e))}`,
    `SUMMARY:${esc(e.title)}`,
    e.location ? `LOCATION:${esc(e.location)}` : null,
    e.description ? `DESCRIPTION:${esc(e.description.slice(0, 800))}` : null,
    e.url ? `URL:${e.url}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  // iCalendar requires CRLF line endings — some clients reject the file without them.
  return lines.join('\r\n') + '\r\n';
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${stamp(new Date(e.startsAt))}/${stamp(endOf(e))}`,
  });
  if (e.location) p.set('location', e.location);
  if (e.description || e.url) {
    p.set('details', [e.description, e.url].filter(Boolean).join('\n\n'));
  }
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function outlookCalendarUrl(e: CalendarEvent): string {
  const p = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: e.title,
    startdt: new Date(e.startsAt).toISOString(),
    enddt: endOf(e).toISOString(),
  });
  if (e.location) p.set('location', e.location);
  if (e.description) p.set('body', e.description);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`;
}
