-- ============================================================
-- 008 — the e-board runs on sessions, not semesters.
--
-- Dues are charged per semester, so `terms` stays exactly as it is.
-- But an e-board serves a full academic year — 2026-27 — and an election
-- is always for the NEXT one. Tying offices to a term was wrong: it made
-- a president's service look like it ended in December.
-- ============================================================

alter table settings add column current_session text not null default '2026-27';

alter table officer_roles add column session text;
alter table elections    add column session text;

-- Backfill from whatever term an office was filed against. A fall term
-- starts a session; a spring term is the back half of the one before.
update officer_roles o
set session = (
  select case
    when t.season = 'fall'
      then t.year || '-' || lpad(((t.year + 1) % 100)::text, 2, '0')
    else (t.year - 1) || '-' || lpad((t.year % 100)::text, 2, '0')
  end
  from terms t where t.id = o.term_id
)
where o.session is null and o.term_id is not null;

update officer_roles
set session = (select current_session from settings where id = 1)
where session is null;

alter table officer_roles alter column session set not null;

-- term_id is no longer how an office is scoped. Kept for history, but an
-- office created from now on has a session and no term.
alter table officer_roles alter column term_id drop not null;
create index officer_roles_session_idx on officer_roles(session) where ended_at is null;

-- An election belongs to the session it elects people into, and there is
-- only ever one per session.
create unique index elections_session_idx on elections (session) where session is not null;
