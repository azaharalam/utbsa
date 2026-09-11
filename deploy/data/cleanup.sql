-- ============================================================
-- One-off production cleanup
--
--   psql "$(grep DATABASE_URL /srv/utbsa/.env.production | cut -d= -f2-)" -f cleanup.sql
--
-- Does four things:
--   1. undoes the event cancellation and its ledger entries
--   2. removes the seeded events
--   3. sets the public contact address
--   4. shows what is left
--
-- Runs as ONE transaction. If any step refuses, nothing is written.
--
-- TAKE A DUMP FIRST. There is no undo:
--   sudo -u postgres pg_dump -Fc utbsa > ~/before-cleanup.dump
-- ============================================================

begin;

-- ── 1. the cancellation ──────────────────────────────────────
--
-- Cancelling wrote ledger entries for a refund that never happened, and an
-- audit row. The ledger is append-only by design, so deleting from it is only
-- defensible when the entries record money that never moved.

do $$
declare paid int;
begin
  select count(*) into paid
  from ticket_orders t join events e on e.id = t.event_id
  where e.cancelled_at is not null and t.amount_cents > 0;

  if paid > 0 then
    raise exception 'A cancelled event has % ticket orders with money attached. '
      'Those ledger entries are a real record — leave them.', paid;
  end if;
end $$;

select 'ledger entries from the cancellation' as removing, count(*)::text as n
from ledger_entries where source_type = 'event' and category in ('refund','processing_fee');

delete from ledger_entries
where source_type = 'event' and category in ('refund','processing_fee');

delete from audit_log where action = 'event.cancel_refund';

update events set cancelled_at = null where cancelled_at is not null;

-- ── 2. the seeded events ─────────────────────────────────────
select 'events being removed' as removing, count(*)::text as n from events;

delete from potluck_items;
delete from rsvps;
delete from ticket_orders;
delete from events;

-- ── 3. the public contact address ────────────────────────────
update settings set org_email = 'info@utoledobsa.org' where id = 1;

commit;

-- ── 4. what is left ──────────────────────────────────────────
select 'members'        as kept, count(*)::text from members
union all select 'officers',      count(*)::text from officer_roles where ended_at is null
union all select 'events',        count(*)::text from events
union all select 'ledger entries', count(*)::text from ledger_entries
union all select 'payments',      count(*)::text from payments
union all select 'donations',     count(*)::text from donations;

select org_email as "contact address now" from settings where id = 1;
