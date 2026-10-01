# Task 3.2 — SQL Querying: Review and Explanations

What this covers: what you wrote, what was changed and why, and how each query in [`db/queries.sql`](../../db/queries.sql) works.

Run it yourself:

```bash
psql "$DATABASE_URL" -f db/schema.sql   # reset
psql "$DATABASE_URL" -f db/seed.sql     # 3 departments (ME has no students), 3 students
psql "$DATABASE_URL" -f db/queries.sql  # one expected error: query 10
```

## Review of your queries

| # | Verdict | What you wrote | What changed and why |
|---|---|---|---|
| 1 | ⚠️ | `insert into departments … ('Mechanical Engg.', 'ME')` | Moved to `db/seed.sql`. In the queries file, a second run fails with `23505` (duplicate code). |
| 2 | ⚠️ | `order by id desc` | `order by created_at desc, id desc`. See [Sorting](#2-sorting-newest-first). |
| 3 | ✅ | `where email = …` | Unchanged. |
| 4 | ⚠️ | `order by name` | `order by s.name`. See [The ambiguous `name`](#4-the-ambiguous-name). |
| 5, 6 | 💡 | No `ORDER BY` | Added one. Without it the row order is not guaranteed. |
| 7 | ✅ | `count(s.id)` + `group by d.id` | Unchanged apart from an alias and `ORDER BY`. You avoided the `count(*)` trap. |
| 8 | ✅ | `having count(s.id) > 1` | Unchanged. |
| 9 | ❌ | `update … where id = 1;` then `select * from students;` | `update … returning *`, inside a transaction that is rolled back. |
| 10 | ⚠️ | Error message in a comment | Added the code, `23503`. The code is what the API will branch on. |
| 11 | ❌ | Missing | Added the transaction with `ROLLBACK`. |
| 12 | ❌ | Missing | Added `EXPLAIN ANALYZE` for queries 3, 4 and 7, and the scale answers. |

Your dev database also had four practice departments (ids 233 to 236) and the renamed "Kunal New". It was reset with `schema.sql` + `seed.sql`.

## The queries, one by one

### 2. Sorting: newest first

```sql
select id, name, email
from students
order by created_at desc, id desc;
```

`id desc` gives the right rows today, but only because ids happen to grow with time. `created_at` is the column that *means* "when". The second sort key matters because `now()` returns the time the **transaction started**: all three seed students were inserted by one statement and have the identical `created_at`. A sort with ties and no tie-breaker can return the tied rows in a different order on each run, which breaks pagination later (the same student appears on page 1 and page 2).

### 3. Filtering

```sql
select id, name, email from students where email = 'kunal@example.com';
```

`email` has a UNIQUE constraint, so this returns 0 or 1 rows. This is the future `findByEmail` in the student repository.

### 4. The ambiguous `name`

Your version ran:

```sql
select s.name, s.email, d.code … order by name asc limit 2;
```

It runs only because exactly one column in the select list is called `name`. Both of these fail:

```sql
select s.name, d.name … order by name;   -- ERROR: ORDER BY "name" is ambiguous
select s.id, d.code   … order by name;   -- ERROR: column reference "name" is ambiguous
```

So the query breaks when someone edits the select list, a line that looks unrelated to the sort. **Rule: in any query with more than one table, qualify every column** (`s.name`).

`LIMIT 2` is applied last, after the sort. Without `ORDER BY`, `LIMIT 2` means "any 2 rows".

### 5 and 6. INNER JOIN vs LEFT JOIN

| | INNER JOIN (query 5) | LEFT JOIN (query 6) |
|---|---|---|
| Keeps | Only rows with a match on both sides | Every row of the **left** table |
| No match | Row is dropped | Right-side columns are `NULL` |
| Result here | 3 rows, no `ME` | 4 rows, `ME` with `NULL` student |

```text
 department_code | student_name
-----------------+--------------
 CSE             | Asha
 CSE             | Kunal
 ECE             | Ravi
 ME              | (null)
```

Which table is on the left decides the question you are answering. `students left join departments` would return the same 3 rows as the inner join, because `department_id` is `NOT NULL` with a foreign key: every student always has a department.

### 7. Counting per group

```sql
select d.code, count(s.id) as student_count
from departments d
left join students s on s.department_id = d.id
group by d.id
order by d.code;
```

- `GROUP BY` collapses the joined rows into one row per department. `count` then runs once per group.
- `count(s.id)` counts rows where `s.id` is **not NULL**. `count(*)` counts rows. `ME` has one joined row (the NULL-filled one), so `count(*)` reports `ME 1`, which is wrong. You got this right.
- You select `d.code` but group by `d.id`. Postgres allows this because `id` is the primary key, so every other column of that table is fixed once `id` is. Grouping by a non-key column would be an error.

Result: `CSE 2`, `ECE 1`, `ME 0`.

### 8. WHERE vs HAVING

```sql
… group by d.id having count(s.id) > 1
```

`WHERE` filters **rows before** grouping, so it can't see `count(...)`. `HAVING` filters **groups after** aggregation. The logical order is:

```text
FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
```

### 9. UPDATE with RETURNING

```sql
begin;
update students
set name = 'Kunal Singh'
where email = 'kunal@example.com'
returning *;
rollback;
```

- Your version ran an `UPDATE` and then a separate `select * from students`. That is two round trips, the second one reads the whole table, and another request can change the row between the two statements. `RETURNING` hands back exactly the rows this statement changed, in the same statement. This is how `PUT /api/students/:id` will return the updated student in Phase 05.
- `psql` prints `UPDATE 1`. In the API, a count of `0` means the id didn't exist, which becomes a 404.
- The transaction is only there so the file leaves the seed data as it found it.

### 10. DELETE blocked by the foreign key

```text
ERROR:  23503: update or delete on table "departments" violates foreign key constraint "students_department_id_fkey"
DETAIL:  Key (id)=(1) is still referenced from table "students".
```

`23503` is the SQLSTATE code. In Phase 04 the repository will catch this code and the API will answer `409` instead of `500`. The human-readable message can change between Postgres versions; the code doesn't. The `\set VERBOSITY verbose` line at the top of the file makes `psql` print it.

### 11. Transactions

```sql
begin;
delete from students;                -- forgot the WHERE
select count(*) from students;       -- 0, but only this connection sees that
rollback;
select count(*) from students;       -- 3
```

- Between `BEGIN` and `COMMIT`/`ROLLBACK`, changes are visible only to your own connection. `ROLLBACK` discards them, `COMMIT` makes them permanent and visible to everyone.
- Without `BEGIN`, every statement is its own transaction and commits immediately. That is why a `DELETE` with no `WHERE` is unrecoverable in normal use.
- **Habit for manual changes on a real database:** `BEGIN`, run the change, check the row count, then `COMMIT`.
- One thing is not rolled back: identity values. If you insert inside a transaction and roll back, those ids are skipped forever (you saw this in Task 3.1).

### 12. Reading EXPLAIN ANALYZE

`EXPLAIN` shows the plan Postgres would use. `EXPLAIN ANALYZE` also **runs** the query and adds the real timings and row counts. Careful: `explain analyze delete …` really deletes.

How to read one line:

```text
Seq Scan on students  (cost=0.00..1.04 rows=1 width=26) (actual time=0.004..0.005 rows=1 loops=1)
                       └── the planner's estimate ───┘   └── what really happened ──────────────┘
```

Plans are trees, read from the most indented node outward.

| Query | Plan (after `ANALYZE`) | Why |
|---|---|---|
| 3 | `Seq Scan on students` | 3 rows fit on one 8 kB page. Reading that page is cheaper than reading the index and then the page. |
| 3, with `enable_seqscan = off` | `Index Scan using students_email_key` | The index works; the planner simply didn't need it. |
| 4 | Seq Scan ×2 → `Nested Loop` → `Sort` → `Limit` | Same reason. `students_department_id_idx` is ignored at this size. |
| 7 | Seq Scan ×2 → `Hash Right Join` → `HashAggregate` → `Sort` | No `WHERE`: every row is needed, so no index could reduce the work. |

**The surprise in this task.** On the first run, right after `schema.sql` + `seed.sql`, query 3 used an *Index Scan*:

| | Before `ANALYZE` | After `ANALYZE` |
|---|---|---|
| `pg_class.reltuples` for `students` | `-1` (unknown) | `3` |
| Planner's guess for the table | about 750 rows | 3 rows, 1 page |
| Plan for query 3 | Index Scan | Seq Scan |

The planner never looks at the table to choose a plan. It reads **statistics** about the table. A new table has none, so the planner assumes a default size and picks the index. `ANALYZE` collects real statistics. Autovacuum runs it automatically, but only after about 50 rows have changed, so a 3-row table is never analyzed by itself. That is why `queries.sql` runs `analyze students, departments;` before the plans.

**Production lesson:** after a bulk load, a restore or a big migration, run `ANALYZE`. A slow query on a database that "has the right index" is very often stale statistics.

## Scale check: 10 → 1k → 100k students

| Query | At 100k | Fix |
|---|---|---|
| 2 (list all, sorted) | Reads, sorts and returns every row. Slowest first. | `LIMIT` (pagination, Phase 09) + an index on `(created_at desc, id desc)` so a page is read from the index with no sort |
| 3 (by email) | Fast. The planner switches to `students_email_key` by itself. | Nothing |
| 4 (by department) | Fast. Uses `students_department_id_idx` (Task 3.1: 0.31 ms vs 2.6 ms). | Nothing |
| 7 (count per department) | Must read every student. | Fine for occasional use; cache it if a dashboard polls it |

**No `LIMIT` at the API level:** Postgres sends 100k rows, Node holds them all in memory, and `JSON.stringify` builds a body of roughly 10 MB while blocking the event loop. A few concurrent requests are enough to exhaust memory. Every list endpoint needs a bounded page size.

## What you learned

- `ORDER BY` needs a tie-breaker; `LIMIT` without `ORDER BY` is arbitrary.
- Qualify columns in every multi-table query.
- INNER drops non-matching rows; LEFT keeps the left table and fills `NULL`.
- `count(column)` skips NULLs, `count(*)` doesn't.
- `WHERE` filters rows, `HAVING` filters groups.
- `RETURNING` replaces "write, then read again".
- `BEGIN` / `ROLLBACK` is the safety net for manual changes.
- The planner picks plans from statistics; `ANALYZE` refreshes them.
