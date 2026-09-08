import 'server-only';
import { sql } from '@/lib/db';
import type { Member } from '@/lib/types';

/**
 * What has happened in the community lately.
 *
 * This exists to make the portal feel like a place with people in it rather
 * than a form. It is deliberately built only from things members chose to
 * make visible — nobody's dues, nobody's balance, nobody's arrival details.
 */

export type PulseItem = {
  kind: 'joined' | 'giveaway' | 'post' | 'housing' | 'job' | 'rsvp';
  at: string;
  title: string;
  detail: string | null;
  href: string;
};

export async function pulse(viewer: Member, limit = 8): Promise<PulseItem[]> {
  if (!['active', 'inactive', 'alumni'].includes(viewer.status)) return [];

  const rows = await sql<any[]>`
    (
      -- New members, but only those who chose to be in the directory.
      select 'joined' as kind, m.approved_at as at, m.full_name as title,
             nullif(concat_ws(' · ', m.department, m.hometown_bd), '') as detail,
             '/portal/directory' as href
      from members m
      where m.status = 'active' and m.approved_at is not null
        and m.in_directory and m.approved_at > now() - interval '45 days'
        and m.id <> ${viewer.id}
      order by m.approved_at desc limit 5
    )
    union all
    (
      select 'giveaway', g.created_at, g.title,
             case when g.price_cents = 0 then 'free'
                  else '$' || (g.price_cents / 100.0)::numeric(10,2)::text end,
             '/portal/giveaway'
      from giveaway_items g
      where g.status = 'available' and g.created_at > now() - interval '45 days'
      order by g.created_at desc limit 5
    )
    union all
    (
      select 'post', p.published_at, p.title, p.excerpt, '/blog/' || p.slug
      from posts p
      where p.status = 'published' and p.published_at > now() - interval '45 days'
      order by p.published_at desc limit 3
    )
    union all
    (
      select 'housing', h.created_at, h.title, h.area, '/portal/housing'
      from housing_posts h
      where h.status = 'open' and h.created_at > now() - interval '45 days'
      order by h.created_at desc limit 3
    )
    union all
    (
      select 'job', j.created_at, j.title, j.organisation, '/portal/jobs'
      from job_posts j
      where j.status = 'open' and j.created_at > now() - interval '45 days'
      order by j.created_at desc limit 3
    )
    order by at desc nulls last
    limit ${limit}
  `;

  return rows.map((r) => ({
    kind: r.kind, at: r.at, title: r.title, detail: r.detail, href: r.href,
  }));
}

/** Small numbers worth showing a member, none of them financial. */
export async function communityStats() {
  const [row] = await sql<{ members: string; new_this_term: string }[]>`
    select
      (select count(*)::text from members where status = 'active') as members,
      (select count(*)::text from members
       where status = 'active' and approved_at > now() - interval '90 days') as new_this_term
  `;
  return {
    members: Number(row.members),
    newThisTerm: Number(row.new_this_term),
  };
}
