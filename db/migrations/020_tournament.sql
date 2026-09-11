-- ============================================================
-- 020 — sporting events: player registration, teams, result
--
-- A sporting event has two kinds of attendee and they behave differently.
--
-- A SPECTATOR rsvp is a headcount for food: one per household, with adults
-- and children counts. That is what rsvps already does.
--
-- A PLAYER registration is strictly per person. Two spouses can both play,
-- possibly on different teams — so the one-rsvp-per-household rule is wrong
-- for players, and they get their own table rather than a flag on rsvps.
-- ============================================================

alter table events
  add column if not exists is_tournament boolean not null default false,
  -- Registration closes before the event so teams can be drawn up.
  add column if not exists player_reg_closes_at timestamptz,
  add column if not exists teams_published_at timestamptz,
  -- Only the result is recorded. No fixtures, no per-match scores.
  add column if not exists champion_team_id uuid,
  add column if not exists runner_up_team_id uuid,
  -- What players are asked to contribute, and what it covers. Shown to
  -- players and admins only — never on the public page.
  add column if not exists player_contribution_cents integer not null default 0,
  add column if not exists cost_breakdown text;

create table if not exists teams (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  name        text not null,
  logo_url    text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists teams_event_idx on teams(event_id);

alter table events
  add constraint events_champion_fk foreign key (champion_team_id)
    references teams(id) on delete set null,
  add constraint events_runner_up_fk foreign key (runner_up_team_id)
    references teams(id) on delete set null;

create table if not exists event_players (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,

  -- A member, OR a guest brought by one. Exactly one of the two.
  member_id   uuid references members(id) on delete cascade,
  guest_name  text,
  -- Who vouched for the guest. Null for members.
  invited_by  uuid references members(id) on delete set null,

  team_id     uuid references teams(id) on delete set null,
  note        text,
  registered_at timestamptz not null default now(),
  -- An admin adding somebody who asked in person rather than registering.
  added_by    uuid references members(id) on delete set null,

  constraint event_players_who check (
    (member_id is not null and guest_name is null)
    or (member_id is null and guest_name is not null)
  )
);

-- One registration per member per event. Guests are not deduplicated —
-- two people can each bring a friend called Rahim.
create unique index if not exists event_players_member_idx
  on event_players(event_id, member_id) where member_id is not null;
create index if not exists event_players_team_idx on event_players(team_id);

-- Contributions are recorded against ticket_orders, which is already
-- per-event and per-member. Deliberately NOT dues_charges: that requires a
-- term and feeds the member's balance, which would mix cricket money into
-- their semester contribution as one number they cannot decompose.
