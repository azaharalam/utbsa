-- ============================================================
-- 019 — write to the personal address, for everyone
--
-- We used to send to a student's @rockets.utoledo.edu address while it still
-- worked. In practice the university quarantines mail from a domain it has
-- not seen before: Brevo reports "Delivered", the university accepts the
-- message, and it never reaches the inbox. The member sees nothing, reports
-- nothing, and concludes the site is broken.
--
-- On a site where the sign-in link IS the password, that is fatal — and it
-- would have hit every student, because every student's contact address was
-- a rockets one.
--
-- The personal address also outlives the degree, which is why we require one.
--
-- The university address STILL SIGNS THEM IN. findByEmail matches any of a
-- member's addresses. This changes where we write, not who can get in.
-- ============================================================

update members
set email = personal_email
where personal_email is not null
  and lower(email) <> lower(personal_email);
