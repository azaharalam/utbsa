-- ============================================================
-- 021 — quarantine rather than delete
--
-- The contact form already had a honeypot, and the SEO spam walked straight
-- past it: anything that parses the form properly leaves the hidden field
-- alone, and plenty of it is sent by a person anyway.
--
-- Scored messages are QUARANTINED, never dropped. A scoring mistake that
-- deletes a real member's message is far worse than one that files it in a
-- second list nobody reads for a week.
-- ============================================================

alter table contact_messages
  add column if not exists spam_score int not null default 0,
  add column if not exists spam_reasons text,
  -- For rate limiting. Not shown anywhere.
  add column if not exists sender_ip text;

create index if not exists contact_messages_spam_idx
  on contact_messages(spam_score, created_at desc);
create index if not exists contact_messages_ip_idx
  on contact_messages(sender_ip, created_at desc);
