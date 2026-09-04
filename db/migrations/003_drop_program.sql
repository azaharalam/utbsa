-- "Level" already captures undergrad/masters/PhD as a structured value,
-- and "Department" captures the field of study. Program was free text
-- duplicating both.
alter table members drop column if exists program;
