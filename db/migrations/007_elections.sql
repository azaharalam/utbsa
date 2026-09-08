-- ============================================================
-- 007 — elections and role-based permissions
--
-- Two rules this schema exists to enforce:
--
--  1. BALLOT SECRECY. `ballots` has no member_id and never will. Who voted
--     lives in `election_voters`; what was voted lives in `ballots`. Nothing
--     joins them — not the app, not raw SQL, not the president with database
--     access. If the two are ever linked, the whole thing is theatre.
--
--  2. FROZEN ELIGIBILITY. The roll is snapshotted into `election_voters` when
--     voting opens. Computing it live would let someone paying dues mid-vote
--     change the electorate underneath a ballot already cast.
-- ============================================================

-- ---------- permissions on a held office ----------
alter table officer_roles add column permission_set text not null default 'none'
  check (permission_set in ('full','money','members','content','events','none'));
alter table officer_roles add column started_at timestamptz not null default now();
alter table officer_roles add column ended_at timestamptz;
alter table officer_roles add column election_id uuid;

-- The old unique (member_id, term_id, title) blocked re-holding a title after
-- resigning. History matters more than that constraint.
alter table officer_roles drop constraint if exists officer_roles_member_id_term_id_title_key;

create index officer_roles_active_idx on officer_roles(member_id) where ended_at is null;

-- ---------- elections ----------
create table elections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  term_id     uuid references terms(id) on delete set null,
  status      text not null default 'draft'
              check (status in ('draft','announced','nominations','poll_ready','voting','closed')),

  nominations_open_on  date,
  nominations_close_on date,
  voting_open_on       date,
  voting_close_on      date,

  announced_at   timestamptz,
  nominations_at timestamptz,
  poll_ready_at  timestamptz,
  voting_at      timestamptz,
  closed_at      timestamptz,

  created_by  uuid references members(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------- positions, frozen once announced ----------
create table election_positions (
  id             uuid primary key default gen_random_uuid(),
  election_id    uuid not null references elections(id) on delete cascade,
  title          text not null,
  permission_set text not null default 'none'
                 check (permission_set in ('full','money','members','content','events','none')),
  description    text,
  sort_order     int not null default 0,
  unique (election_id, title)
);

-- ---------- nominations ----------
create table nominations (
  id             uuid primary key default gen_random_uuid(),
  election_id    uuid not null references elections(id) on delete cascade,
  position_id    uuid not null references election_positions(id) on delete cascade,
  member_id      uuid not null references members(id) on delete cascade,
  statement      text,
  status         text not null default 'pending'
                 check (status in ('pending','approved','declined','withdrawn')),
  decline_reason text,
  created_by     uuid references members(id) on delete set null,  -- null = self
  reviewed_by    uuid references members(id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  -- One position per person, per election.
  unique (election_id, member_id)
);

create index nominations_position_idx on nominations(position_id, status);

-- ---------- who may vote, and whether they have ----------
-- Snapshotted when voting opens. Holds no ballot data.
create table election_voters (
  election_id uuid not null references elections(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  voted_at    timestamptz,
  primary key (election_id, member_id)
);

-- ---------- ballots ----------
-- NO member_id. Do not add one. Do not add created_by, ip, user_agent, or
-- anything else that could narrow a ballot to a person.
create table ballots (
  id          uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table ballot_choices (
  ballot_id     uuid not null references ballots(id) on delete cascade,
  position_id   uuid not null references election_positions(id) on delete cascade,
  nomination_id uuid references nominations(id) on delete cascade,  -- null = abstain
  primary key (ballot_id, position_id)
);

create index ballot_choices_tally_idx on ballot_choices(position_id, nomination_id);

-- ---------- carry existing admins into the new model ----------
-- Anyone who is currently `role = admin` keeps full access, so nobody is
-- locked out the moment this migration runs.
insert into officer_roles (member_id, term_id, title, permission_set, is_eboard, sort_order)
select m.id, t.id, 'Administrator', 'full', false, 99
from members m
cross join lateral (select id from terms where is_current limit 1) t
where m.role = 'admin' and m.status = 'active'
  and not exists (
    select 1 from officer_roles o
    where o.member_id = m.id and o.ended_at is null and o.permission_set = 'full'
  );
