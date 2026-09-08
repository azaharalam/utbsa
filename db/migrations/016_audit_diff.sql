-- ============================================================
-- 016 — record what actually changed
--
-- "Tanvir changed a status" is not an answer. "Tanvir changed Rafid's status
-- from pending to active" is. Without the before value, a log tells you
-- something happened and nothing else.
-- ============================================================

alter table audit_log add column operation text
  check (operation in ('create','update','delete'));

-- The row as it was, the row as it became, and just the fields that moved.
-- `changed` is redundant with the other two, but it is what gets displayed,
-- and computing a diff in the browser on every page load would be silly.
alter table audit_log add column before_data jsonb;
alter table audit_log add column after_data  jsonb;
alter table audit_log add column changed     jsonb;

create index audit_log_entity_idx on audit_log(entity, entity_id, created_at desc);
create index audit_log_operation_idx on audit_log(operation) where operation is not null;
