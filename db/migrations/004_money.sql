-- ============================================================
-- 004_money — Phase 2. Dues, donations, ticketing, ledger.
--
-- Rules this schema enforces:
--   · All money is integer cents. Never floats.
--   · Balances are derived, never stored.
--   · A charge freezes its own amount, so raising dues later
--     cannot rewrite what people owed in the past.
--   · Nothing is deleted. Corrections are offsetting rows.
-- ============================================================

-- ---------- settings: one row, id fixed at 1 ----------
create table settings (
  id                 int primary key default 1 check (id = 1),
  payments_enabled   boolean not null default false,
  fee_mode           text not null default 'absorb'
                     check (fee_mode in ('absorb','pass_through','optional')),
  dues_default_cents int not null default 1500,
  org_email          text,
  updated_at         timestamptz not null default now()
);

insert into settings (id) values (1);

-- ---------- dues rate lives on the term ----------
alter table terms add column dues_cents int not null default 1500;
alter table terms add column dues_assessed_at timestamptz;

-- ---------- households: who pays, not who owes ----------
create table households (
  id         uuid primary key default gen_random_uuid(),
  label      text,
  created_at timestamptz not null default now()
);

alter table members add column household_id uuid references households(id) on delete set null;
create index members_household_idx on members(household_id);

-- Every existing member gets their own household, so the balance
-- query has something to hang on from day one.
insert into households (id, label)
select gen_random_uuid(), full_name from members;

update members m
set household_id = h.id
from households h
where h.label = m.full_name and m.household_id is null;

-- ---------- charges ----------
create table dues_charges (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references members(id) on delete cascade,
  term_id      uuid not null references terms(id) on delete cascade,
  amount_cents int  not null check (amount_cents >= 0),
  assessed_at  timestamptz not null default now(),
  note         text,
  unique (member_id, term_id)
);

create index dues_charges_term_idx on dues_charges(term_id);

-- ---------- funds ----------
create table funds (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  is_restricted boolean not null default false,
  description   text,
  created_at    timestamptz not null default now()
);

insert into funds (name, is_restricted, description) values
  ('General', false, 'Unrestricted. Can be spent on anything.'),
  ('Dues Assistance', true, 'Covers dues for members who cannot pay.');

-- ---------- payments ----------
create table payments (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references households(id) on delete cascade,
  amount_cents    int  not null check (amount_cents > 0),
  method          text not null
                  check (method in ('card','cash','zelle','check','fund','other')),
  fund_id         uuid references funds(id),   -- set when method = 'fund'
  paid_on         date not null default current_date,
  term_id         uuid references terms(id),
  recorded_by     uuid references members(id) on delete set null,
  external_ref    text,                        -- Stripe id, cheque number
  import_batch_id uuid,
  row_hash        text,                        -- makes CSV import idempotent
  note            text,
  created_at      timestamptz not null default now(),
  constraint fund_payment_needs_fund
    check (method <> 'fund' or fund_id is not null)
);

create index payments_household_idx on payments(household_id);
create unique index payments_row_hash_idx on payments(row_hash) where row_hash is not null;

-- ---------- adjustments: waivers, write-offs, credits ----------
create table adjustments (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  member_id    uuid references members(id) on delete set null,
  kind         text not null
               check (kind in ('waiver','write_off','credit','correction')),
  amount_cents int not null,      -- signed: positive reduces the balance
  reason       text not null,
  term_id      uuid references terms(id),
  created_by   uuid references members(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index adjustments_household_idx on adjustments(household_id);

-- ---------- donors and donations ----------
create table donors (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text,
  type         text not null default 'individual'
               check (type in ('individual','alumni','faculty','university','business','organization')),
  member_id    uuid references members(id) on delete set null,
  is_anonymous boolean not null default false,
  note         text,
  created_at   timestamptz not null default now()
);

create table donations (
  id                  uuid primary key default gen_random_uuid(),
  donor_id            uuid not null references donors(id) on delete cascade,
  fund_id             uuid not null references funds(id),
  amount_cents        int  not null check (amount_cents > 0),
  received_on         date not null default current_date,
  method              text not null default 'cash'
                      check (method in ('card','cash','zelle','check','in_kind','other')),
  is_in_kind          boolean not null default false,
  in_kind_description text,
  acknowledged_at     timestamptz,
  external_ref        text,
  note                text,
  recorded_by         uuid references members(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index donations_fund_idx on donations(fund_id);
create index donations_ack_idx  on donations(acknowledged_at) where acknowledged_at is null;

-- ---------- events: type and ticketing ----------
alter table events add column event_type text not null default 'social'
  check (event_type in ('cultural','social','orientation','sporting'));
alter table events add column is_ticketed boolean not null default false;
alter table events add column member_price_cents int not null default 0;
alter table events add column guest_price_cents  int not null default 0;
alter table events add column child_price_cents  int not null default 0;
alter table events add column capacity int;
alter table events add column cancelled_at timestamptz;

create table ticket_orders (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events(id) on delete cascade,
  member_id       uuid references members(id) on delete set null,  -- null = walk-up
  purchaser_name  text not null,
  purchaser_email text,
  qty_adult       int not null default 1 check (qty_adult >= 0),
  qty_child       int not null default 0 check (qty_child >= 0),
  amount_cents    int not null check (amount_cents >= 0),
  status          text not null default 'paid'
                  check (status in ('pending','paid','refunded','cancelled')),
  method          text not null default 'cash'
                  check (method in ('card','cash','zelle','check','other')),
  external_ref    text,
  recorded_by     uuid references members(id) on delete set null,
  created_at      timestamptz not null default now(),
  refunded_at     timestamptz
);

create index ticket_orders_event_idx on ticket_orders(event_id);

-- ---------- RSVP ----------
create table rsvps (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  member_id    uuid not null references members(id) on delete cascade,
  guest_count  int not null default 0 check (guest_count >= 0 and guest_count <= 20),
  note         text,
  created_at   timestamptz not null default now(),
  checked_in_at timestamptz,
  unique (event_id, member_id)
);

-- ---------- status change requests ----------
create table status_change_requests (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references members(id) on delete cascade,
  from_type         text not null,
  to_type           text not null,
  reason            text,
  requested_at      timestamptz not null default now(),
  decided_by        uuid references members(id) on delete set null,
  decided_at        timestamptz,
  decision          text check (decision in ('approved','declined')),
  effective_term_id uuid references terms(id),
  note              text
);

create index scr_pending_idx on status_change_requests(decided_at) where decided_at is null;

-- ---------- CSV import batches ----------
create table import_batches (
  id              uuid primary key default gen_random_uuid(),
  uploaded_by     uuid references members(id) on delete set null,
  filename        text,
  row_count       int not null default 0,
  matched_count   int not null default 0,
  unmatched_count int not null default 0,
  committed_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------- the ledger: append-only, single source of truth ----------
create table ledger_entries (
  id           uuid primary key default gen_random_uuid(),
  occurred_on  date not null default current_date,
  direction    text not null check (direction in ('in','out')),
  category     text not null,
  -- in:  dues | donation | ticket | other
  -- out: refund | processing_fee | expense | fund_disbursement
  amount_cents int  not null check (amount_cents > 0),
  fund_id      uuid references funds(id),
  term_id      uuid references terms(id),
  source_type  text,     -- payment | donation | ticket_order | adjustment
  source_id    uuid,
  note         text,
  recorded_by  uuid references members(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index ledger_occurred_idx on ledger_entries(occurred_on desc);
create index ledger_category_idx on ledger_entries(direction, category);
