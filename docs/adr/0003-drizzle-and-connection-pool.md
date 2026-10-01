# ADR 0003: Drizzle ORM over a single `pg` connection pool

- **Status:** Accepted
- **Date:** 2026-10-01
- **Phase:** 04, Task 4.1

## Context

The PostgreSQL schema exists (ADR 0002), but the API still served data from module-level arrays. The repositories (ADR 0001) are the only place that knows how data is stored, so they are the only place that has to change.

The app needs three things to talk to Postgres: a driver, a way to reuse connections, and a way to build queries without concatenating strings.

## Decision

- **Driver and pool:** `pg`, with exactly one `Pool` per process, created in `src/db/client.js` and exported together with the Drizzle instance `db`. Pool size stays at the default (10).
- **Query builder:** `drizzle-orm`. Tables are described in `src/db/schema.js`; the JS key is camelCase and the column name is snake_case (`createdAt` ↔ `created_at`). Every value is sent as a bound parameter.
- **Only `src/db/` and `src/repositories/` import Drizzle.** Controllers keep calling `findAll` / `findById` / `findByCode` / `create`; those functions are now `async`.
- **Fail fast at startup.** A missing `DATABASE_URL` throws when `client.js` loads. `server.js` runs `SELECT 1` before `listen` and exits with code 1 if it fails.
- **Survive a lost connection.** The pool has an `error` listener. Without it, an idle connection closed by Postgres crashes the Node process.
- **No `try/catch` in controllers.** Express 5 forwards a rejected promise from an `async` handler to the error middleware, which answers 500.
- **Configuration:** `dotenv` is imported in `server.js` and `client.js` (Kunal's choice), so `npm start` works without `--env-file`. `npm run dev` also passes `--env-file=.env`; variables already set are not overridden.
- **`drizzle-kit` is installed but not used yet.** Tables still come from `db/schema.sql`.

## Consequences

**Good**

- Department data survives restarts and is shared by every instance.
- Routes and the response envelope did not change. Only the repository body and `await` in the callers did.
- Queries are parameterized, so input can't change the SQL.

**Costs and limits**

- The table is defined twice (`db/schema.sql` and `src/db/schema.js`) and must be kept in sync by hand until migrations replace the SQL file.
- `drizzle-kit push` is dangerous right now: `schema.js` has only `departments`, so push would drop `students`.
- Students are still in memory, so a student can reference a department id that exists only in Postgres, and the foreign key is not exercised yet (Task 4.2).
- Duplicate department codes are still caught by a `findByCode` pre-check, which is a race. Mapping `23505` to 409 comes in Task 4.2.
- A database outage after startup gives 500 on database routes. `/health` still says `ok` because it doesn't check the database.
- Each instance holds up to 10 connections and Postgres allows about 100, so about 10 instances is the ceiling before a pooler (PgBouncer) is needed.
- Responses for departments now include `createdAt`. This is an additive API change.
