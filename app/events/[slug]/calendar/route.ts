import { sql } from '@/lib/db';
import { toIcs } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

/**
 * A downloadable .ics, for Apple Calendar and desktop clients that will not
 * take a URL. Public, because a public event page is public — there is
 * nothing here that is not already on the page.
 */
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const [e] = await sql<any[]>`
    select id, slug, title, description, starts_at, ends_at,
           location_name, location_addr, is_published, cancelled_at
    from events where slug = ${params.slug}
  `;

  if (!e || !e.is_published) {
    return new Response('Not found', { status: 404 });
  }
  if (e.cancelled_at) {
    return new Response('That event was cancelled', { status: 410 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const ics = toIcs({
    title: e.title,
    description: e.description,
    location: [e.location_name, e.location_addr].filter(Boolean).join(', '),
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    url: `${base}/events/${e.slug}`,
  }, e.id);

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${e.slug}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
