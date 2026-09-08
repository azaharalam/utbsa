-- ============================================================
-- 005 — remove the household layer.
--
-- Households were meant to let one person pay for a family. But only
-- students are ever charged, so the layer bought nothing: it just put
-- an indirection between a charge and the person who owed it.
--
-- Charges, payments, and adjustments now all point at a member.
-- ============================================================

-- ---------- payments ----------
alter table payments add column member_id uuid references members(id) on delete cascade;

-- Move each payment to a student in that household. Where a household had
-- two students, the payment lands on the one who joined first — the demo
-- data is the only place that happens, and the totals stay correct.
update payments p
set member_id = (
  select m.id from members m
  where m.household_id = p.household_id
  order by (m.member_type = 'student') desc, m.created_at
  limit 1
)
where p.member_id is null;

delete from payments where member_id is null;

alter table payments alter column member_id set not null;
alter table payments drop column household_id;
create index payments_member_idx on payments(member_id);

-- ---------- adjustments ----------
update adjustments a
set member_id = (
  select m.id from members m
  where m.household_id = a.household_id
  order by (m.member_type = 'student') desc, m.created_at
  limit 1
)
where a.member_id is null;

delete from adjustments where member_id is null;

alter table adjustments alter column member_id set not null;
alter table adjustments drop column household_id;
create index adjustments_member_idx on adjustments(member_id);

-- ---------- members ----------
alter table members drop column household_id;

drop table if exists households;

-- ---------- expense categories ----------
-- The ledger's `category` stays free text so it can grow, but the UI now
-- offers a fixed list. Existing rows keep whatever they had.
