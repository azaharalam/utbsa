-- ============================================================
-- The 2026-27 e-board
--
-- Run once, directly on the server:
--
--   psql "$DATABASE_URL" -f deploy/data/eboard.sql
--
-- or, if you would rather not paste the URL:
--
--   sudo -u postgres psql utbsa -f deploy/data/eboard.sql
--
-- SAFE TO RUN TWICE. Members are matched on email, so re-running updates
-- rather than duplicating. Offices are replaced, not stacked.
--
-- This file holds real people's contact details. Keep it OUT of git.
-- ============================================================

begin;

-- ────────────────────────────────────────────────────────────
-- Fill in one block per officer. Copy the block, do not edit
-- the parts marked "leave alone".
--
--   university_email  must end in utoledo.edu, or be NULL
--   personal_email    required for students and alumni
--   member_type       student | alumni | faculty | spouse | community
--   student_level     undergrad | masters | phd | na  (or NULL)
--                     NOT "MS" or "PhD" — the database rejects those
--   permission_set    full | money | members | content | events | none
--
-- Access levels:
--   full     everything, including assigning offices  (President, Gen. Sec.)
--   money    dues, transfers, donations, funds, ledger  (Treasurer)
--   members  approvals, member records, posts, events   (Vice President)
--   content  posts and events                           (Media Officer)
--   events   events only                                (Event/Cultural/Sports)
--   none     listed publicly, no admin access           (Faculty Advisor)
-- ────────────────────────────────────────────────────────────

create temporary table incoming (
  full_name        text not null,
  university_email text,
  personal_email   text,
  phone            text,
  member_type      text not null default 'student',
  student_level    text,
  department       text,
  hometown_bd      text,
  title            text not null,
  permission_set   text not null,
  sort_order       int  not null
);

insert into incoming
  (full_name, university_email, personal_email, phone,
   member_type, student_level, department, hometown_bd,
   title, permission_set, sort_order) values

  -- ── President ─────────────────────────────────────────────
  ('FULL NAME',
   'name@rockets.utoledo.edu',
   'name@gmail.com',
   '419 000 0000',
   'student', 'phd', 'Department', 'Home district',
   'President', 'full', 0),

  -- ── Vice President ────────────────────────────────────────
  ('FULL NAME',
   'name@rockets.utoledo.edu',
   'name@gmail.com',
   null,
   'student', 'masters', 'Department', null,
   'Vice President', 'members', 1),

  -- ── General Secretary ─────────────────────────────────────
  ('FULL NAME',
   'name@rockets.utoledo.edu',
   'name@gmail.com',
   null,
   'student', null, null, null,
   'General Secretary', 'full', 2),

  -- ── Treasurer ─────────────────────────────────────────────
  ('FULL NAME',
   'name@rockets.utoledo.edu',
   'name@gmail.com',
   null,
   'student', null, null, null,
   'Treasurer', 'money', 3),

  -- ── Event Coordinator ─────────────────────────────────────
  ('FULL NAME', 'name@rockets.utoledo.edu', 'name@gmail.com', null,
   'student', null, null, null,
   'Event Coordinator', 'events', 4),

  -- ── Cultural Secretary ────────────────────────────────────
  ('FULL NAME', 'name@rockets.utoledo.edu', 'name@gmail.com', null,
   'student', null, null, null,
   'Cultural Secretary', 'events', 5),

  -- ── Sports Secretary ──────────────────────────────────────
  ('FULL NAME', 'name@rockets.utoledo.edu', 'name@gmail.com', null,
   'student', null, null, null,
   'Sports Secretary', 'events', 6),

  -- ── Media Officer ─────────────────────────────────────────
  ('FULL NAME', 'name@rockets.utoledo.edu', 'name@gmail.com', null,
   'student', null, null, null,
   'Media Officer', 'content', 7),

  -- ── Faculty Advisor ───────────────────────────────────────
  -- Faculty use their university address as the contact one, and are
  -- never charged dues.
  ('FULL NAME', 'name@utoledo.edu', null, null,
   'faculty', null, 'Department', null,
   'Faculty Advisor', 'none', 8)
;

-- ══════════════════════════════════════════════════════════════
-- Everything below is machinery. Leave it alone.
-- ══════════════════════════════════════════════════════════════

-- Guard rails, so a typo fails loudly instead of creating a broken record.
do $$
declare bad record;
begin
  for bad in
    select full_name, university_email from incoming
    where university_email is not null and university_email not ilike '%utoledo.edu'
  loop
    raise exception 'University address for % is not a utoledo.edu address: %',
      bad.full_name, bad.university_email;
  end loop;

  for bad in
    select full_name from incoming
    where member_type in ('student','alumni') and coalesce(personal_email,'') = ''
  loop
    raise exception 'Student or alum % has no personal address. '
      'Their UToledo address stops working when they leave.', bad.full_name;
  end loop;

  for bad in
    select full_name from incoming where coalesce(full_name,'') = '' or full_name = 'FULL NAME'
  loop
    raise exception 'A block still has the placeholder name. Fill it in or delete the block.';
  end loop;

  for bad in
    select permission_set from incoming
    where permission_set not in ('full','money','members','content','events','none')
  loop
    raise exception 'Unknown access level: %. Use full, money, members, content, events or none.',
      bad.permission_set;
  end loop;

  -- These two match check constraints on `members`. Catching them here names
  -- the person and the allowed values, rather than failing later with a row
  -- dump and a constraint name.
  for bad in
    select full_name, student_level from incoming
    where student_level is not null
      and student_level not in ('undergrad','masters','phd','na')
  loop
    raise exception 'student_level for % is "%". Use undergrad, masters, phd or na — not MS or PhD.',
      bad.full_name, bad.student_level;
  end loop;

  for bad in
    select full_name, member_type from incoming
    where member_type not in ('student','alumni','faculty','spouse','community')
  loop
    raise exception 'member_type for % is "%". Use student, alumni, faculty, spouse or community.',
      bad.full_name, bad.member_type;
  end loop;

  -- Some offices are singular; "Executive member" legitimately is not.
  for bad in
    select title from incoming
    where lower(title) in ('president','general secretary','treasurer',
                           'media officer','faculty advisor')
    group by title having count(*) > 1
  loop
    raise exception 'Two people are listed as %. That office has one holder.', bad.title;
  end loop;

  for bad in
    select coalesce(personal_email, university_email) as e from incoming
    group by 1 having count(*) > 1
  loop
    raise exception 'The address % appears twice. One office per person.', bad.e;
  end loop;
end $$;

-- The address we WRITE to: students get their UToledo one while it works,
-- everyone else their personal one.
alter table incoming add column contact_email text;
update incoming set contact_email = case
  when member_type = 'student' then coalesce(university_email, personal_email)
  else coalesce(personal_email, university_email)
end;

-- Insert or update, matched on any address they already have.
alter table incoming add column member_id uuid;

update incoming i set member_id = m.id
from members m
where lower(m.email) = lower(i.contact_email)
   or lower(m.university_email) = lower(coalesce(i.university_email, '~none~'))
   or lower(m.personal_email) = lower(coalesce(i.personal_email, '~none~'));

-- New people.
with created as (
  insert into members (
    full_name, email, university_email, personal_email, phone,
    member_type, student_level, department, hometown_bd,
    status, email_verified_at, approved_at, in_directory
  )
  select i.full_name, lower(i.contact_email),
         lower(i.university_email), lower(i.personal_email), i.phone,
         i.member_type, i.student_level, i.department, i.hometown_bd,
         'active', now(), now(), true
  from incoming i where i.member_id is null
  returning id, lower(email) as email
)
update incoming i set member_id = c.id
from created c where lower(i.contact_email) = c.email;

-- People who already existed — update, never overwrite with nulls.
update members m set
  full_name        = i.full_name,
  email            = lower(i.contact_email),
  university_email = coalesce(lower(i.university_email), m.university_email),
  personal_email   = coalesce(lower(i.personal_email), m.personal_email),
  phone            = coalesce(i.phone, m.phone),
  member_type      = i.member_type,
  student_level    = coalesce(i.student_level, m.student_level),
  department       = coalesce(i.department, m.department),
  hometown_bd      = coalesce(i.hometown_bd, m.hometown_bd),
  status           = 'active',
  approved_at      = coalesce(m.approved_at, now()),
  email_verified_at = coalesce(m.email_verified_at, now())
from incoming i
where m.id = i.member_id;

-- End whatever these people currently hold.
update officer_roles o set ended_at = now()
where o.ended_at is null
  and o.member_id in (select member_id from incoming);

-- AND end anyone else currently holding one of these titles this session.
--
-- Without this, listing a new Faculty Advisor leaves the old one in place and
-- the public page shows two. It also happens when somebody already exists in
-- the database under a different address, so the match above misses them.
update officer_roles o set ended_at = now()
where o.ended_at is null
  and o.session = (select current_session from settings where id = 1)
  and lower(o.title) in (select lower(title) from incoming);

insert into officer_roles
  (member_id, session, title, permission_set, is_eboard, sort_order)
select i.member_id,
       (select current_session from settings where id = 1),
       i.title, i.permission_set, true, i.sort_order
from incoming i;

commit;

-- ── anyone who looks like a duplicate ────────────────────────
-- Two records with the same name usually means someone already existed under
-- a different address, and this script created a second copy. Merge them by
-- hand if so — the office is on the new record.
select m1.full_name, count(*) as records,
       string_agg(m1.email, ', ') as addresses
from members m1
where m1.status = 'active'
group by m1.full_name having count(*) > 1;

-- ── what you just created ────────────────────────────────────
select o.sort_order as "#",
       o.title      as "office",
       m.full_name  as "name",
       o.permission_set as "access",
       m.email      as "we write to",
       coalesce(m.phone, '—') as "phone"
from officer_roles o
join members m on m.id = o.member_id
where o.ended_at is null and o.session = (select current_session from settings where id = 1)
order by o.sort_order;

select count(*) filter (where permission_set = 'full') as "offices with full access"
from officer_roles where ended_at is null;
