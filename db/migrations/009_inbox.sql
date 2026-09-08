-- ============================================================
-- 009 — who dealt with a contact message
--
-- Messages were being saved and counted but never shown anywhere, so a
-- question about airport pickup went straight into a black hole.
-- ============================================================

alter table contact_messages add column handled_by uuid references members(id) on delete set null;
alter table contact_messages add column handled_at timestamptz;

create index contact_messages_open_idx on contact_messages(created_at desc) where not handled;
