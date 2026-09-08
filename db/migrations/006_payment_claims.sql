-- ============================================================
-- 006 — money arrives outside the website.
--
-- The university does not allow us to take card payments, so dues are
-- sent by bank transfer and the member tells us the reference.
--
-- A submitted reference is a CLAIM, not a payment. Anyone could type
-- "ABC123". Nothing touches a balance until the treasurer has matched it
-- against the actual account and confirmed it.
-- ============================================================

-- ---------- second email ----------
-- Students use their university address while they are here; it stops
-- working after they graduate, which is exactly when alumni go quiet.
alter table members add column personal_email text;

-- ---------- where to send the money ----------
alter table settings add column pay_method_label text not null default 'Zelle';
alter table settings add column pay_to_name      text not null default 'UTBSA';
alter table settings add column pay_to_handle    text not null default 'utbsa.toledo@gmail.com';
alter table settings add column pay_instructions text;

update settings set pay_instructions =
  'Send the amount by Zelle, then come back and paste the transaction ID below. '
  || 'The treasurer checks it against the account, usually within a few days.'
where id = 1;

-- ---------- claims ----------
create table payment_claims (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid not null references members(id) on delete cascade,
  transaction_ref text not null,
  amount_cents   int  not null check (amount_cents > 0),
  sent_on        date not null,
  method_label   text,
  note           text,

  status         text not null default 'pending'
                 check (status in ('pending','confirmed','rejected')),
  reviewed_by    uuid references members(id) on delete set null,
  reviewed_at    timestamptz,
  reject_reason  text,
  payment_id     uuid references payments(id) on delete set null,

  submitted_via  text not null default 'link'
                 check (submitted_via in ('link','portal')),
  created_at     timestamptz not null default now()
);

create index payment_claims_status_idx on payment_claims(status, created_at);
create index payment_claims_member_idx on payment_claims(member_id);

-- The same reference cannot be claimed twice while one is live.
create unique index payment_claims_ref_idx
  on payment_claims (lower(transaction_ref))
  where status in ('pending','confirmed');

-- ---------- claim tokens ----------
-- Deliberately NOT a session. A token opens one page with one form and can
-- do exactly one thing: attach a claim to this member. It cannot read the
-- directory, open the portal, or change anything.
--
-- Worst case if a link leaks: someone submits a transaction ID the treasurer
-- then rejects. That small blast radius is why there is no expiry — the token
-- is rotated each time a dues email goes out, which is a better control than
-- a clock.
create table claim_tokens (
  id         uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  member_id  uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index claim_tokens_member_idx on claim_tokens(member_id);
