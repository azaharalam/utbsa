-- ============================================================
-- Undo an event cancellation done by mistake
--
--   psql "$(grep DATABASE_URL .env.production | cut -d= -f2-)" -f undo-event-cancel.sql
--
-- Cancelling an event writes three things: it marks ticket orders refunded,
-- it writes ledger entries for the refund and any unrecovered card fees, and
-- it writes an audit entry.
--
-- The ledger is append-only by design, so removing rows from it is not
-- something the app will ever do. Doing it by hand is only defensible when
-- the entries record money that never actually moved — which is the case
-- here, since no ticket was ever sold.
--
-- Shows you what it will remove before committing.
-- ============================================================

begin;

-- ── what is about to go ──────────────────────────────────────
select 'ledger entries from a cancellation' as removing,
       count(*)::text as n,
       coalesce(sum(amount_cents), 0)::text as cents
from ledger_entries
where source_type = 'event' and category in ('refund', 'processing_fee');

select 'audit entries for cancellations' as removing, count(*)::text as n
from audit_log where action = 'event.cancel_refund';

-- ── refuse if any of it recorded real money ──────────────────
--
-- If a ticket was genuinely sold and refunded, these entries are a true
-- record and deleting them would put the books out. Stop instead.
do $$
declare paid int;
begin
  -- Only orders belonging to a CANCELLED event matter here. A paid ticket on
  -- some other event is none of this script's business.
  select count(*) into paid
  from ticket_orders t
  join events e on e.id = t.event_id
  where e.cancelled_at is not null
    and t.amount_cents > 0;

  if paid > 0 then
    raise exception 'A cancelled event has % ticket orders with money attached. '
      'Those ledger entries are a real record of refunded money — deleting them '
      'would put the books out. Leave them, and un-cancel the event from '
      '/admin/events instead.', paid;
  end if;
end $$;

-- ── remove ───────────────────────────────────────────────────
delete from ledger_entries
where source_type = 'event' and category in ('refund', 'processing_fee');

delete from audit_log where action = 'event.cancel_refund';

-- ── un-cancel the events ─────────────────────────────────────
update events set cancelled_at = null where cancelled_at is not null;

update ticket_orders set status = 'paid', refunded_at = null
where status = 'refunded' and amount_cents = 0;

commit;

-- ── what is left ─────────────────────────────────────────────
select 'ledger entries' as remaining, count(*)::text from ledger_entries
union all select 'audit entries', count(*)::text from audit_log
union all select 'cancelled events', count(*)::text from events where cancelled_at is not null;
