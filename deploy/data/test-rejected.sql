-- A rejected member, so /auth/pending can actually be looked at.
-- LOCAL ONLY. Delete the row when you are done.
insert into members (full_name, email, personal_email, member_type,
                     status, rejected_reason, email_verified_at)
values ('Rejected Tester', 'rejected@yopmail.com', 'rejected@yopmail.com',
        'student', 'rejected',
        'We could not match this to a current student record.', now())
on conflict (email) do update
  set status = 'rejected',
      rejected_reason = 'We could not match this to a current student record.';

select full_name, email, status from members where email = 'rejected@yopmail.com';
