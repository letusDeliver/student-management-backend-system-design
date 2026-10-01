-- Constraint experiments: every statement below the seed check SHOULD fail.
-- Run on a freshly seeded database:
--   psql "$DATABASE_URL" -f db/experiments.sql
-- psql keeps going after an error (ON_ERROR_STOP is off), so you see every failure.

-- Print the SQLSTATE code with each error (e.g. "ERROR:  23505: ...").
\set VERBOSITY verbose

-- 23505 unique_violation: department code already exists
insert into departments (name, code) values ('Duplicate CSE', 'CSE');

-- 23503 foreign_key_violation: department 999 does not exist
insert into students (name, email, department_id) values ('Ghost', 'ghost@example.com', 999);

-- 23502 not_null_violation: name is missing
insert into students (email, department_id)
    values ('noname@example.com', (select id from departments where code = 'CSE'));

-- 23505 unique_violation: email already taken
insert into students (name, email, department_id)
    values ('Kunal Again', 'kunal@example.com', (select id from departments where code = 'CSE'));

-- 23503 foreign_key_violation: CSE still has students
delete from departments where code = 'CSE';

-- 428C9 generated_always: GENERATED ALWAYS forbids supplying your own id
insert into departments (id, name, code) values (100, 'Manual Id', 'MAN');

-- Known gap (this one SUCCEEDS): UNIQUE is case-sensitive, so this "duplicate" gets in.
-- Rolled back so the seed data stays clean. Fix later (lower(email) unique index / citext).
begin;
insert into students (name, email, department_id)
    values ('Kunal Upper', 'KUNAL@example.com', (select id from departments where code = 'CSE'));
select id, email from students where lower(email) = 'kunal@example.com';
rollback;

-- Nothing above changed the data: still 3 departments, 3 students.
select (select count(*) from departments) as departments, (select count(*) from students) as students;
