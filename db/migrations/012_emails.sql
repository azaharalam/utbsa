-- ============================================================
-- 012 — two addresses, either one signs you in
--
-- The university address dies at graduation, which is exactly when we most
-- want to keep in touch. Rather than migrating someone's login at that
-- moment — an event that has to fire correctly or lock them out — both
-- addresses work forever and nothing has to switch.
--
--   students and alumni : university address REQUIRED (proves they were
--                         here) and personal address REQUIRED (still works
--                         after they leave)
--   everyone else       : personal address only
--
-- `email` remains the address we SEND to. It is derived from member_type,
-- so it changes by itself when a student becomes an alum.
-- ============================================================

alter table members add column university_email text;

-- Backfill: anyone who signed up with a utoledo address had it as `email`.
update members
set university_email = email
where email ilike '%utoledo.edu' and university_email is null;

-- Everyone else's `email` was already personal.
update members
set personal_email = email
where personal_email is null
  and (email not ilike '%utoledo.edu' or email is null);

create unique index members_university_email_idx on members (lower(university_email))
  where university_email is not null;
create unique index members_personal_email_idx on members (lower(personal_email))
  where personal_email is not null;

-- A university address has to look like one. Checked here as well as in the
-- form, because a server action is a public endpoint.
alter table members add constraint university_email_domain
  check (university_email is null or university_email ilike '%utoledo.edu');
