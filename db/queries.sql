-- Task 3.2: querying the seed data. Run on a freshly seeded database:
--   psql "$DATABASE_URL" -f db/queries.sql
-- Leaves the data unchanged: every write below is rolled back or rejected.
-- (ANALYZE in section 12 only refreshes planner statistics.)
-- Explanations: docs/notes/task-3.2-sql-querying.md

-- Print the SQLSTATE code with each error (e.g. "ERROR:  23503: ...").
\set VERBOSITY verbose

-- 1. The department with no students (ME) comes from db/seed.sql.
select id, code, name from departments order by code;

-- 2. All students, newest first.
-- created_at is the meaning of "newest"; id breaks ties (rows inserted in one
-- transaction share the same now()).
select id, name, email
from students
order by created_at desc, id desc;

-- 3. The student with a given email.
select id, name, email
from students
where email = 'kunal@example.com';

-- 4. Students in CSE, sorted by name, first 2 only.
-- Qualify the sort column: both tables have a "name".
select s.id, s.name, s.email, d.code
from students s
join departments d on d.id = s.department_id
where d.code = 'CSE'
order by s.name
limit 2;

-- 5. Every student with their department (INNER JOIN): 3 rows, ME does not appear.
select s.name  as student_name,
       s.email as student_email,
       d.code  as department_code,
       d.name  as department_name
from students s
inner join departments d on d.id = s.department_id
order by s.name;

-- 6. Every department with its students, including empty ones (LEFT JOIN): 4 rows,
-- ME appears once with NULL student columns.
select d.code  as department_code,
       d.name  as department_name,
       s.name  as student_name,
       s.email as student_email
from departments d
left join students s on s.department_id = d.id
order by d.code, s.name;

-- 7. Number of students per department: CSE 2, ECE 1, ME 0.
-- count(s.id) skips NULLs; count(*) would count ME's NULL-filled row and report 1.
-- Grouping by the primary key lets us select d.code without listing it in GROUP BY.
select d.code, count(s.id) as student_count
from departments d
left join students s on s.department_id = d.id
group by d.id
order by d.code;

-- 8. Only departments with more than 1 student.
-- WHERE filters rows before grouping; HAVING filters groups after.
select d.code, count(s.id) as student_count
from departments d
left join students s on s.department_id = d.id
group by d.id
having count(s.id) > 1
order by d.code;

-- 9. Rename one student and get the changed row back in the same statement.
-- Rolled back so the seed data stays clean.
begin;
update students
set name = 'Kunal Singh'
where email = 'kunal@example.com'
returning *;
rollback;

-- 10. 23503 foreign_key_violation: CSE still has students, so this must fail.
delete from departments where code = 'CSE';

-- 11. A transaction is all-or-nothing: the "forgot the WHERE" delete, undone.
begin;
delete from students;
select count(*) as students_inside_transaction from students;   -- 0
rollback;
select count(*) as students_after_rollback from students;       -- 3

-- 12. Query plans. EXPLAIN ANALYZE runs the query and reports what actually happened.

-- The planner chooses a plan from table statistics, not from the table itself.
-- A freshly created table has none (pg_class.reltuples = -1), so the planner guesses
-- ~750 rows and picks index scans. ANALYZE collects real statistics (3 rows, 1 page).
-- Autovacuum does this by itself, but only after ~50 changed rows.
analyze students, departments;

-- Query 3: Seq Scan, although students_email_key (the UNIQUE index) exists.
-- The whole table is one 8 kB page, so reading it is cheaper than index + table.
explain analyze
select id, name, email
from students
where email = 'kunal@example.com';

-- Same query with seq scans discouraged: Index Scan using students_email_key.
-- Proves the index is usable; the planner just didn't need it at 3 rows.
-- (set local lasts until the end of the transaction. Never do this in app code.)
begin;
set local enable_seqscan = off;
explain analyze
select id, name, email
from students
where email = 'kunal@example.com';
rollback;

-- Query 4: Seq Scan on both tables, Nested Loop join, Sort, then Limit.
-- students_department_id_idx is ignored for the same reason as above.
explain analyze
select s.id, s.name, s.email, d.code
from students s
join departments d on d.id = s.department_id
where d.code = 'CSE'
order by s.name
limit 2;

-- Query 7: Seq Scan on both tables, Hash Right Join, HashAggregate per department, Sort.
-- No WHERE, so every row is needed and an index could not reduce the work.
explain analyze
select d.code, count(s.id) as student_count
from departments d
left join students s on s.department_id = d.id
group by d.id
order by d.code;

-- Scale: 10 -> 1k -> 100k students
-- Q: Which query gets slow first, and what would you add?
-- A: Query 2. It has no WHERE and no LIMIT, so it reads, sorts and returns every
--    row. Add LIMIT (pagination) and an index on (created_at desc, id desc) so the
--    first page is read straight from the index with no sort.
--    Queries 3 and 4 stay fast: the planner switches to the email and
--    department_id indexes by itself once the table is big (Task 3.1: 0.31 ms vs 2.6 ms).
--    Query 7 must read every student; if it shows on a dashboard, cache the result.
-- Q: Query 2 has no LIMIT. What happens to the API response at 100k rows?
-- A: Postgres sends 100k rows, Node holds them all in memory and serializes one
--    ~10 MB JSON body per request. A few concurrent requests exhaust memory and block
--    the event loop during JSON.stringify. Every list endpoint needs a bounded page size.
