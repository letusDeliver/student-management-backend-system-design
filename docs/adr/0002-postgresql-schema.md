# ADR 0002: PostgreSQL as the data store, with integrity rules in the schema

- **Status:** Accepted
- **Date:** 2026-09-30
- **Phase:** 03, Task 3.1

## Context

The repositories keep data in module-level arrays. That storage has four problems:

- Data is lost on every restart.
- Each server instance has its own copy, so two instances disagree.
- `nextId++` isn't coordinated across instances.
- Integrity rules (department exists, code is unique) are checked only in controller code. A race, a script or a bug can bypass them.

Emails aren't unique at all.

Docker is installed, but for now Kunal chose to use the Homebrew PostgreSQL 16 already running locally. Containerizing moves to Phase 19.

## Decision

Use **PostgreSQL**, with the schema written in plain SQL under `db/` before any ORM is introduced (Drizzle arrives in Phase 04).

- **Least-privilege access.** The app connects as the role `sms_app`, which owns the database `sms_dev` (`db/setup.sql`). It never connects as the superuser. Ownership is required on PG 15+ to create tables in `public`.
- **Integrity lives in the database.** `NOT NULL`, `UNIQUE (departments.code)`, `UNIQUE (students.email)` and a named foreign key `students_department_id_fkey`. Application checks remain for friendly error messages, but the DB is the guarantee.
- **Ids:** `integer GENERATED ALWAYS AS IDENTITY`, not `SERIAL`. Clients can't supply ids.
- **Deletes:** the foreign key has no `ON DELETE` clause (NO ACTION). A department with students can't be deleted, and nothing cascades silently.
- **Types and naming:** `text` for strings, `timestamptz` for time, and snake_case identifiers. Mapping to camelCase for the API is the repository/ORM's job.
- **Foreign-key index:** `students_department_id_idx` exists because Postgres doesn't index FK columns automatically.
- **Configuration:** a single `DATABASE_URL` in `.env`, with placeholders in `.env.example`.

## Consequences

- **Good:** measured on 100k students, `WHERE department_id = ?` takes 0.31 ms with the FK index and 2.6 ms as a sequential scan. The scan grows linearly with the table.
- **Good:** constraint violations surface as stable SQLSTATE codes: `23505` unique, `23503` foreign key, `23502` not null. The API can map them to 409 or 422 later instead of racing check-then-insert.
- **Cost:** a local database is now required to run the project. Setup is manual (`setup.sql` → `schema.sql` → `seed.sql`) until migrations (Drizzle Kit) and Docker Compose arrive.
- **Known gap:** `UNIQUE (email)` is case-sensitive (`A@x.com` ≠ `a@x.com`). To fix later with a unique index on `lower(email)` or `citext`.
- **Known gap:** `departments.code` isn't forced to uppercase in the DB. The controller normalizes it, so a direct SQL insert could bypass that (possible fix: a `CHECK (code = upper(code))` constraint).
- **Note:** identity values are never reused, so failed or rolled-back inserts leave gaps in ids. Ids are identifiers, not counters.
- **Not yet:** the Express app still uses the in-memory repositories. Wiring it to Postgres is Phase 04.
