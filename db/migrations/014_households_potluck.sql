-- ============================================================
-- 015 — households (for attendance), and potluck sign-ups
--
-- HOUSEHOLDS ARE BACK, BUT FOR A DIFFERENT REASON.
--
-- Migration 005 removed households because they were tangled up with DUES,
-- and dues genuinely are per-student: a couple who are both students owe $30.
-- That has not changed and must not change.
--
-- Attendance is the opposite. Rafid and Rumana are two accounts but one car,
-- one household, and two plates. Without a link they both RSVP and the
-- headcount says four.
--
-- So: households affect RSVP and invitations. They never touch dues_charges,
-- payments, or adjustments — those still point straight at a member.
-- ============================================================

create table households (
  id         uuid primary key default gen_random_uuid(),
  label      text,
  created_at timestamptz not null default now()
);

alter table members add column household_id uuid references households(id) on delete set null;
create index members_household_idx on members(household_id);

-- Linking has to be consented. Otherwise anyone could declare themselves
-- someone's spouse and start answering for them.
create table household_invites (
  id           uuid primary key default gen_random_uuid(),
  from_member  uuid not null references members(id) on delete cascade,
  to_member    uuid not null references members(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending','accepted','declined','cancelled')),
  message      text,
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  check (from_member <> to_member)
);

create unique index household_invites_open_idx
  on household_invites (least(from_member, to_member), greatest(from_member, to_member))
  where status = 'pending';

-- ---------- RSVP becomes a household answer ----------
alter table rsvps add column household_id uuid references households(id) on delete cascade;
alter table rsvps add column adults   int not null default 1 check (adults between 1 and 20);
alter table rsvps add column children int not null default 0 check (children between 0 and 20);

-- guest_count meant "people other than me". Fold it into the adult count.
update rsvps set adults = 1 + coalesce(guest_count, 0);
alter table rsvps drop column guest_count;

-- One answer per household per event, when the member belongs to one.
create unique index rsvps_household_idx on rsvps (event_id, household_id)
  where household_id is not null;

-- ---------- potluck ----------
alter table events add column is_potluck boolean not null default false;

-- One row per dish someone should bring. Three beef rows means three people
-- each cooking for fifteen — that is why rows are duplicated rather than
-- carrying a quantity.
create table potluck_items (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  category   text not null,
  dish       text not null,
  covers     int  not null default 10 check (covers between 1 and 200),
  note       text,
  sort_order int  not null default 0,

  claimed_by uuid references members(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create index potluck_items_event_idx on potluck_items(event_id, sort_order);
create index potluck_items_open_idx  on potluck_items(event_id) where claimed_by is null;
