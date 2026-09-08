-- ============================================================
-- 013 — public recognition for sponsors
--
-- A gift is private until the donor says otherwise. Nobody's name goes on
-- a public page because they gave money; they have to agree to it.
-- ============================================================

alter table donors add column show_publicly boolean not null default false;
alter table donors add column public_name text;   -- trading name, if different
alter table donors add column website text;
alter table donors add column blurb text;

-- Businesses and organisations are the usual sponsors; individuals are
-- usually happier unnamed. Neither is assumed — this only marks who to ask.
create index donors_public_idx on donors(type) where show_publicly;
