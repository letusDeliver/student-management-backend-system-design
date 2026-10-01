# Phase 03 — Interview Notes: PostgreSQL

Format: **likely question → crisp answer → where we saw it in the project.**

---

## 1. Why use a database instead of keeping data in the application's memory?

A database is a **separate, durable process**. Data survives restarts and deploys, every app instance sees the same data, and the database enforces integrity rules no matter which client writes to it. In-memory arrays are lost on restart and split per process behind a load balancer.

**Seen in:** Task 3.1. Rows survived `brew services restart postgresql@16`.

## 2. If the API already validates input, why add constraints in the database?

App-level checks are for good error messages. They can't guarantee anything, because "check, then insert" is a race: two requests both check that an email is free, and both insert. Only the database sees every write, so only a `UNIQUE` constraint closes that gap. The same applies to `NOT NULL` and foreign keys.

**Seen in:** `db/experiments.sql` and [ADR 0002](../adr/0002-postgresql-schema.md).

## 3. What do these error codes mean: 23505, 23503, 23502?

| SQLSTATE | Name | Our example | HTTP status (Phase 04) |
|---|---|---|---|
| 23505 | unique_violation | duplicate `email` or department `code` | 409 |
| 23503 | foreign_key_violation | student with a missing department; deleting a department that has students | 422 / 409 |
| 23502 | not_null_violation | student without a `name` | 400 |

Branch on the **code**, never on the message text.

## 4. `SERIAL` or `GENERATED ALWAYS AS IDENTITY`?

Identity. It is the SQL standard, the sequence is owned by the column, and `ALWAYS` rejects a client-supplied id (`428C9`). With `SERIAL`, a manual insert of an id desynchronizes the sequence and a later insert fails with a duplicate key.

Ids can have gaps: a sequence value used by a rolled-back or failed insert is never reused. Gaps are normal; never rely on ids being consecutive.

## 5. Does Postgres index foreign key columns automatically?

No. It indexes `PRIMARY KEY` and `UNIQUE` columns only. Without an index on `students.department_id`, "students of department X" scans the whole table, and so does every `DELETE` on `departments` (it must check for referencing students).

**Seen in:** Task 3.1 at 100k rows: 2.6 ms (Seq Scan) vs 0.31 ms (Bitmap Index Scan).

## 6. INNER JOIN vs LEFT JOIN?

INNER keeps only rows that match on both sides. LEFT keeps every row of the left table and fills the right side with `NULL` when nothing matches. Use LEFT when "none" is a valid answer, such as departments with zero students.

**Seen in:** Task 3.2. INNER returned 3 rows, LEFT returned 4 (`ME` with NULLs).

## 7. `count(*)` vs `count(column)`?

`count(*)` counts rows. `count(column)` counts rows where that column is not NULL. After a LEFT JOIN, an empty department still has one NULL-filled row, so `count(*)` reports 1 and `count(s.id)` reports 0.

## 8. WHERE vs HAVING?

`WHERE` filters rows **before** grouping and can't use aggregates. `HAVING` filters groups **after** aggregation. Logical order: `FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`.

## 9. Why does `LIMIT` need `ORDER BY`, and why does `ORDER BY` need a tie-breaker?

Without `ORDER BY`, the row order is unspecified, so `LIMIT 10` means "any 10 rows". With ties in the sort column, the tied rows can come back in a different order on each run, and paginated results then repeat or skip rows. Add a unique column last: `order by created_at desc, id desc`.

**Seen in:** Task 3.2. All seed students share one `created_at`, because `now()` is the transaction start time.

## 10. What is a transaction?

A group of statements that succeed or fail as one unit. Changes are visible only to your connection until `COMMIT`; `ROLLBACK` discards them. Without `BEGIN`, each statement commits by itself.

**Seen in:** Task 3.2. `delete from students` inside `BEGIN … ROLLBACK`: count was 0 inside, 3 after.

## 11. What does `RETURNING` do?

It makes `INSERT`, `UPDATE` and `DELETE` return the affected rows in the same statement. It replaces "write, then select again", which costs a second round trip and can read a row someone else changed in between.

## 12. How do you find out why a query is slow?

`EXPLAIN ANALYZE`. Read the tree from the most indented node outward and compare the estimated `rows` with the actual `rows`.

- `Seq Scan` on a large table with a selective `WHERE` usually means a missing index.
- An index that exists but isn't used on a **small** table is correct: one page is cheaper to read than index + page.
- Estimates far from the actual numbers mean **stale statistics**. Run `ANALYZE`.

**Seen in:** Task 3.2. A freshly created 3-row table used an Index Scan (no statistics, planner guessed ~750 rows). After `ANALYZE` it switched to Seq Scan.

## 13. What is a least-privilege database role?

The app connects as a role that can do only what the app needs. Ours (`sms_app`) owns one database and is not a superuser, so a SQL injection or leaked credential can't drop other databases or read server files.

## 14. Why must schema files be re-runnable?

So anyone can rebuild the database from the repository with one command and get the same result. `DROP TABLE IF EXISTS` at the top, every statement ending in `;`, seed data looked up by natural key (`code`) instead of hard-coded ids. Hand-run SQL files are replaced by versioned migrations in Phase 04 (Drizzle Kit).

---

## Scale check: 10 → 1k → 100k students

| Scale | What breaks | Fix |
|---|---|---|
| 10 | Nothing. Every plan is a Seq Scan and that is correct. | — |
| 1k | Listing without `LIMIT` starts to return large responses. | Pagination (Phase 09) |
| 100k | Unindexed filters and sorts scan the whole table; unbounded lists exhaust app memory. | Indexes on filter/sort columns, bounded page size, `ANALYZE` after bulk loads |
