-- ============================================================
-- 011 — record which office someone held when they acted
--
-- Looking the office up at read time would be wrong: once Tanvir resigns,
-- every entry he ever made would show him as a plain member, and
-- "which president approved that waiver?" becomes unanswerable.
--
-- So the title is snapshotted at write time and never changes.
-- ============================================================

alter table audit_log add column actor_role text;

-- Backfill from whatever office each actor holds now. Imperfect for people
-- who have already changed office, but better than nothing, and every entry
-- from here on is exact.
update audit_log a
set actor_role = (
  select o.title from officer_roles o
  where o.member_id = a.actor_id and o.ended_at is null
  order by o.sort_order limit 1
)
where a.actor_id is not null and a.actor_role is null;

-- Signing in and signing up are not exercises of power, and they drowned
-- out the entries that matter.
delete from audit_log where action in ('auth.login', 'member.signup');
