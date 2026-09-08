-- ============================================================
-- 017 — students can be donors
--
-- The donation form has offered "Student" since it was built, but the check
-- constraint never allowed it, so choosing it failed with a database error.
--
-- The form was right. A student who puts $20 in the tin at Boishakh is a
-- donor, and worth distinguishing from an alum or a business — students
-- giving on top of their dues is exactly the thing a treasurer wants to see.
-- ============================================================

alter table donors drop constraint if exists donors_type_check;

alter table donors add constraint donors_type_check
  check (type in ('individual','student','alumni','faculty','university','business','organization'));
