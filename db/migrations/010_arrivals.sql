-- ============================================================
-- 010 — new student services, alumni, and the community boards
--
-- PRIVACY NOTE, because this is the one place it differs from the rest of
-- the app: arrival requests come from people who are NOT members yet. They
-- contain a flight number, a phone number, and a date on which someone will
-- predictably be alone at an airport with luggage.
--
-- That data is visible to the volunteer who claims the request and to
-- officers with the `members` permission. It is never public and never in
-- the member directory.
-- ============================================================

create table arrival_requests (
  id            uuid primary key default gen_random_uuid(),

  -- They usually have no account yet, so this stands alone.
  full_name     text not null,
  email         text not null,
  phone         text,
  member_id     uuid references members(id) on delete set null,

  arriving_on   date not null,
  arriving_at   time,
  airport       text default 'DTW',
  flight_no     text,
  people_count  int not null default 1 check (people_count between 1 and 10),
  luggage_note  text,

  needs_pickup   boolean not null default true,
  needs_stay     boolean not null default false,
  needs_shopping boolean not null default false,

  program       text,
  department    text,
  note          text,

  status        text not null default 'open'
                check (status in ('open','claimed','done','cancelled')),
  claimed_by    uuid references members(id) on delete set null,
  claimed_at    timestamptz,
  closed_note   text,
  created_at    timestamptz not null default now()
);

create index arrival_requests_open_idx on arrival_requests(arriving_on)
  where status in ('open','claimed');

-- ---------- things graduating students leave behind ----------
create table giveaway_items (
  id          uuid primary key default gen_random_uuid(),
  posted_by   uuid not null references members(id) on delete cascade,
  title       text not null,
  description text,
  category    text not null default 'other'
              check (category in ('furniture','kitchen','bedding','electronics',
                                  'books','winter','other')),
  condition   text default 'good' check (condition in ('new','good','worn')),
  price_cents int not null default 0 check (price_cents >= 0),  -- 0 = free
  photo_url   text,
  status      text not null default 'available'
              check (status in ('available','claimed','gone')),
  claimed_by  uuid references members(id) on delete set null,
  claimed_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index giveaway_available_idx on giveaway_items(created_at desc)
  where status = 'available';

-- ---------- rooms and sublets ----------
create table housing_posts (
  id             uuid primary key default gen_random_uuid(),
  posted_by      uuid not null references members(id) on delete cascade,
  kind           text not null check (kind in ('offering','seeking','sublet')),
  title          text not null,
  area           text,
  rent_cents     int check (rent_cents >= 0),
  available_from date,
  description    text,
  status         text not null default 'open' check (status in ('open','closed')),
  created_at     timestamptz not null default now()
);

-- ---------- alumni job and referral board ----------
create table job_posts (
  id          uuid primary key default gen_random_uuid(),
  posted_by   uuid not null references members(id) on delete cascade,
  title       text not null,
  organisation text not null,
  location    text,
  kind        text not null default 'full_time'
              check (kind in ('full_time','internship','part_time','assistantship','referral')),
  link        text,
  description text,
  closes_on   date,
  status      text not null default 'open' check (status in ('open','closed')),
  created_at  timestamptz not null default now()
);

create index job_posts_open_idx on job_posts(created_at desc) where status = 'open';
