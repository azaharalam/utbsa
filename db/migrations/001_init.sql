-- ============================================================
-- 001_init — the whole Phase 1 schema.
--
-- Every table here is yours. There is no auth provider, no
-- managed users table, no row-level security. Authorization
-- happens in lib/queries/*.ts. Read that file before you write
-- a new query.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Semesters. Everything else hangs off this. ----------
create table terms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  season     text not null check (season in ('spring','fall','summer')),
  year       int  not null,
  starts_on  date not null,
  ends_on    date not null,
  is_current boolean not null default false,
  unique (season, year)
);

create unique index terms_one_current on terms (is_current) where is_current;

-- ---------- Members. This is your users table. ----------
create table members (
  id uuid primary key default gen_random_uuid(),

  -- captured at signup
  full_name  text not null,
  email      text not null unique,
  phone      text,
  heard_from text,

  -- filled in afterwards
  bengali_name  text,
  photo_url     text,
  member_type   text not null default 'student'
                check (member_type in ('student','spouse','faculty','alumni','community')),
  student_level text check (student_level in ('undergrad','masters','phd','na')),
  department    text,
  program       text,
  expected_grad date,
  hometown_bd   text,
  arrival_date  date,
  bio           text,
  linkedin_url  text,
  emergency_contact_name  text,
  emergency_contact_phone text,

  -- privacy: what other signed-in members may see
  show_email      boolean not null default true,
  show_phone      boolean not null default false,
  show_photo      boolean not null default true,
  show_department boolean not null default true,
  show_hometown   boolean not null default true,
  in_directory    boolean not null default true,

  -- system
  status text not null default 'pending'
         check (status in ('pending','active','inactive','rejected','alumni')),
  role   text not null default 'member' check (role in ('member','admin')),
  email_verified_at timestamptz,
  approved_at       timestamptz,
  approved_by       uuid references members(id) on delete set null,
  rejected_reason   text,
  last_seen_at      timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index members_status_idx on members(status);
create index members_email_idx  on members(lower(email));

-- ---------- Sessions. Cookie holds a random token; we store its hash. ----------
create table sessions (
  id          uuid primary key default gen_random_uuid(),
  token_hash  text not null unique,
  member_id   uuid not null references members(id) on delete cascade,
  user_agent  text,
  ip          text,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index sessions_member_idx  on sessions(member_id);
create index sessions_expiry_idx  on sessions(expires_at);

-- ---------- Magic-link tokens. Single use, short lived. ----------
create table login_tokens (
  id          uuid primary key default gen_random_uuid(),
  token_hash  text not null unique,
  email       text not null,
  purpose     text not null default 'login' check (purpose in ('login','signup')),
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index login_tokens_email_idx on login_tokens(lower(email), created_at desc);

-- ---------- E-board, scoped to a term ----------
create table officer_roles (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(id) on delete cascade,
  term_id    uuid not null references terms(id) on delete cascade,
  title      text not null,
  is_eboard  boolean not null default true,
  sort_order int not null default 0,
  unique (member_id, term_id, title)
);

-- ---------- Blog ----------
create table posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  excerpt      text,
  body         text not null default '',
  cover_url    text,
  category     text,
  author_id    uuid references members(id) on delete set null,
  status       text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index posts_published_idx on posts(status, published_at desc);

-- ---------- Events ----------
create table events (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  bengali_title text,
  description   text,
  cover_url     text,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  location_name text,
  location_addr text,
  is_public     boolean not null default true,
  is_published  boolean not null default true,
  term_id       uuid references terms(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index events_starts_idx on events(starts_at desc);

-- ---------- Contact form ----------
create table contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  subject    text,
  message    text not null,
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Audit log. Who did what, kept across e-board handovers. ----------
create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references members(id) on delete set null,
  action     text not null,
  entity     text,
  entity_id  uuid,
  detail     jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on audit_log(created_at desc);

-- ---------- updated_at ----------
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger members_touch before update on members
  for each row execute function touch_updated_at();
create trigger posts_touch before update on posts
  for each row execute function touch_updated_at();
