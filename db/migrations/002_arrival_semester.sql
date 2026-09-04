-- Drop the Bengali name field, and replace the free-form arrival date
-- with a semester + year pair. Nobody remembers the exact day they landed,
-- but everybody remembers the semester.

alter table members drop column if exists bengali_name;
alter table members drop column if exists arrival_date;

alter table members add column arrival_semester text
  check (arrival_semester in ('spring','summer','fall'));
alter table members add column arrival_year int
  check (arrival_year between 1990 and 2100);
