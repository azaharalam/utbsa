-- ============================================================
-- 018 — a rejected member can ask us to look again
--
-- They can already sign in and see why they were turned down, but the only
-- route back was the public contact form, where they would have to explain
-- who they are from scratch to someone who already has their record.
-- ============================================================

alter table contact_messages add column member_id uuid references members(id) on delete set null;
alter table contact_messages add column kind text not null default 'general'
  check (kind in ('general', 'appeal'));

create index contact_messages_appeal_idx on contact_messages(created_at desc)
  where kind = 'appeal' and not handled;
