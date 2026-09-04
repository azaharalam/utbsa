import 'server-only';
import { sql } from '@/lib/db';
import type { Member, Post, EventRow, Term, Officer } from '@/lib/types';

function assertAdmin(actor: Member) {
  if (actor.role !== 'admin' || actor.status !== 'active') throw new Error('Admins only.');
}

// ───────────────────────── terms ─────────────────────────
export async function currentTerm(): Promise<Term | null> {
  const rows = await sql<Term[]>`select * from terms where is_current limit 1`;
  return rows[0] ?? null;
}

// ───────────────────────── posts ─────────────────────────
export async function publishedPosts(limit = 500): Promise<Post[]> {
  return sql<Post[]>`
    select p.*, m.full_name as author_name, m.photo_url as author_photo
    from posts p left join members m on m.id = p.author_id
    where p.status = 'published'
    order by p.published_at desc nulls last
    limit ${limit}
  `;
}

export async function postBySlug(slug: string): Promise<Post | null> {
  const rows = await sql<Post[]>`
    select p.*, m.full_name as author_name, m.photo_url as author_photo
    from posts p left join members m on m.id = p.author_id
    where p.slug = ${slug} and p.status = 'published'
    limit 1
  `;
  return rows[0] ?? null;
}

export async function allPosts(actor: Member): Promise<Post[]> {
  assertAdmin(actor);
  return sql<Post[]>`select * from posts order by created_at desc`;
}

export async function postById(actor: Member, id: string): Promise<Post | null> {
  assertAdmin(actor);
  const rows = await sql<Post[]>`select * from posts where id = ${id} limit 1`;
  return rows[0] ?? null;
}

export type PostInput = {
  id?: string; slug: string; title: string; excerpt: string | null;
  body: string; category: string | null; publish: boolean;
};

export async function savePost(actor: Member, p: PostInput) {
  assertAdmin(actor);
  const status = p.publish ? 'published' : 'draft';
  const publishedAt = p.publish ? new Date() : null;

  if (p.id) {
    await sql`
      update posts set
        slug = ${p.slug}, title = ${p.title}, excerpt = ${p.excerpt},
        body = ${p.body}, category = ${p.category}, status = ${status},
        published_at = coalesce(published_at, ${publishedAt})
      where id = ${p.id}
    `;
    return p.id;
  }

  const rows = await sql<{ id: string }[]>`
    insert into posts (slug, title, excerpt, body, category, status, published_at, author_id)
    values (${p.slug}, ${p.title}, ${p.excerpt}, ${p.body}, ${p.category},
            ${status}, ${publishedAt}, ${actor.id})
    returning id
  `;
  return rows[0].id;
}

export async function deletePost(actor: Member, id: string) {
  assertAdmin(actor);
  await sql`delete from posts where id = ${id}`;
}

// ───────────────────────── events ─────────────────────────
export async function upcomingEvents(viewer: Member | null, limit = 500): Promise<EventRow[]> {
  const isMember = !!viewer && ['active', 'inactive', 'alumni'].includes(viewer.status);
  return sql<EventRow[]>`
    select * from events
    where is_published and starts_at >= now()
      and (is_public or ${isMember})
    order by starts_at
    limit ${limit}
  `;
}

export async function pastEvents(viewer: Member | null, limit = 12): Promise<EventRow[]> {
  const isMember = !!viewer && ['active', 'inactive', 'alumni'].includes(viewer.status);
  return sql<EventRow[]>`
    select * from events
    where is_published and starts_at < now()
      and (is_public or ${isMember})
    order by starts_at desc
    limit ${limit}
  `;
}

export async function eventBySlug(viewer: Member | null, slug: string): Promise<EventRow | null> {
  const isMember = !!viewer && ['active', 'inactive', 'alumni'].includes(viewer.status);
  const rows = await sql<EventRow[]>`
    select * from events
    where slug = ${slug} and is_published and (is_public or ${isMember})
    limit 1
  `;
  return rows[0] ?? null;
}

export async function allEvents(actor: Member): Promise<EventRow[]> {
  assertAdmin(actor);
  return sql<EventRow[]>`select * from events order by starts_at desc`;
}

export type EventInput = {
  id?: string; slug: string; title: string; bengali_title: string | null;
  description: string | null; starts_at: Date; ends_at: Date | null;
  location_name: string | null; location_addr: string | null; is_public: boolean;
};

export async function saveEvent(actor: Member, e: EventInput) {
  assertAdmin(actor);
  const term = await currentTerm();

  if (e.id) {
    await sql`
      update events set
        slug = ${e.slug}, title = ${e.title}, bengali_title = ${e.bengali_title},
        description = ${e.description}, starts_at = ${e.starts_at}, ends_at = ${e.ends_at},
        location_name = ${e.location_name}, location_addr = ${e.location_addr},
        is_public = ${e.is_public}
      where id = ${e.id}
    `;
    return e.id;
  }

  const rows = await sql<{ id: string }[]>`
    insert into events (slug, title, bengali_title, description, starts_at, ends_at,
                        location_name, location_addr, is_public, term_id)
    values (${e.slug}, ${e.title}, ${e.bengali_title}, ${e.description},
            ${e.starts_at}, ${e.ends_at}, ${e.location_name}, ${e.location_addr},
            ${e.is_public}, ${term?.id ?? null})
    returning id
  `;
  return rows[0].id;
}

export async function deleteEvent(actor: Member, id: string) {
  assertAdmin(actor);
  await sql`delete from events where id = ${id}`;
}

// ───────────────────────── e-board ─────────────────────────
export async function officers(termId?: string): Promise<Officer[]> {
  const term = termId ?? (await currentTerm())?.id;
  if (!term) return [];
  return sql<Officer[]>`
    select o.id, o.title, o.sort_order, m.id as member_id, m.full_name,
           m.photo_url, m.department, m.email
    from officer_roles o
    join members m on m.id = o.member_id
    where o.term_id = ${term} and o.is_eboard
    order by o.sort_order, o.title
  `;
}

export async function addOfficer(actor: Member, memberId: string, title: string, sortOrder: number) {
  assertAdmin(actor);
  const term = await currentTerm();
  if (!term) throw new Error('No current term is set.');
  await sql`
    insert into officer_roles (member_id, term_id, title, sort_order)
    values (${memberId}, ${term.id}, ${title}, ${sortOrder})
    on conflict (member_id, term_id, title) do update set sort_order = excluded.sort_order
  `;
}

export async function removeOfficer(actor: Member, id: string) {
  assertAdmin(actor);
  await sql`delete from officer_roles where id = ${id}`;
}

// ───────────────────────── contact ─────────────────────────
export async function saveMessage(m: { name: string; email: string; subject: string | null; message: string }) {
  await sql`
    insert into contact_messages (name, email, subject, message)
    values (${m.name}, ${m.email}, ${m.subject}, ${m.message})
  `;
}

export async function unhandledMessageCount(actor: Member) {
  assertAdmin(actor);
  const [{ n }] = await sql<{ n: string }[]>`
    select count(*)::text as n from contact_messages where not handled
  `;
  return Number(n);
}
