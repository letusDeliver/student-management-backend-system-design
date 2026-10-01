# memory.md — Kunal's Learning Progress

## Concepts learned
- Raw node:http: one handler per request; routing is manual branching on method/pathname
- Request body is a stream (data/end events); Buffer.concat beats string += (multi-byte safety)
- 400 (malformed input) vs 404 (valid request, missing resource)
- Express: express.json({limit}), 4-arg error middleware, 404 middleware, body-parser error types
- app.js/server.js split → tests import app without listening (Supertest)
- express.Router: mount once with a prefix, relative paths inside; controllers = named handler functions
- ES modules are evaluated once and cached → module-level state is a per-process singleton
- 409 Conflict (valid request that clashes with server state) vs 400 (malformed)
- Repository layer: owns data, hides storage, no HTTP knowledge; controllers call it (ADR 0001)
- 422 vs 404: a body referencing a missing entity is 422; 404 is for URLs
- ESM checks imports at load time, but an undefined identifier fails only when that line runs
- DB = separate durable process that enforces integrity; app-level checks are UX, DB constraints are the guarantee
- Roles vs databases; least-privilege app role; OWNER needed on PG15+ to create tables in public
- psql: `=#` superuser vs `=>` normal role; `-#` = statement waiting for `;`; `\r` resets buffer; backslash commands are psql-only, one per line; `-c` / `-f` from the shell
- Unix socket vs TCP (localhost/::1) connections
- Constraints and SQLSTATE: 23505 unique, 23503 FK, 23502 not null, 428C9 GENERATED ALWAYS, 25P02 aborted transaction
- Identity/sequence values are never rolled back → id gaps are normal
- FK columns aren't auto-indexed; EXPLAIN: Seq Scan vs Bitmap Index Scan (100k rows: 2.6 ms vs 0.31 ms)
- INNER vs LEFT JOIN (LEFT keeps unmatched left rows with NULLs); `count(col)` skips NULLs, `count(*)` doesn't
- GROUP BY the primary key allows selecting that table's other columns; WHERE filters rows, HAVING filters groups
- ORDER BY needs a unique tie-breaker; `now()` is the transaction start time, so one statement's rows share `created_at`
- `RETURNING` replaces write-then-read; BEGIN/ROLLBACK makes changes private until COMMIT
- Driver (`pg`) vs pool vs query builder (Drizzle); one Pool per process; Drizzle queries resolve to arrays (`const [row] = await …`)
- Express 5 forwards rejected promises from async handlers to the error middleware (no try/catch needed in controllers)
- An EventEmitter `error` with no listener crashes the process → `pool.on("error")` for idle connections
- The planner uses statistics, not the table: a fresh table (reltuples -1) gets index scans until `ANALYZE`; small tables correctly use Seq Scan

## Currently learning
- Phase 04 Drizzle ORM (in progress; 4.1 departments done, 4.2 students + constraint error mapping next)

## Mistakes & lessons
- Mistake: buffered the request body with no size limit (a 200MB POST pushed RSS from 88MB to 639MB).
  Lesson: every input needs an explicit bound; unbounded buffering is a trivial DoS.
- Mistake: installed dotenv + created .env but never loaded it; PORT silently fell back to the default.
  Lesson: config should fail loudly; use `node --env-file`. Default values can hide misconfiguration.
- Mistake (1.2): POST required a client-supplied `id` → duplicate ids and garbage accepted.
  Lesson: identity is server-owned (later: DB identity column).
- Mistake (1.2): destructured `req.body` without a guard → non-JSON request gave 500.
  Lesson: Express 5 leaves req.body undefined when the Content-Type isn't parsed; client errors must be 4xx.
- Mistake (1.2): `Number.isInteger(id || id <= 0)`, a misplaced paren; -1 passed, 0 failed only by accident.
  Lesson: test boundary values (0, -1, 1.5, "abc"); code that is "right for the wrong reason" is a bug.
- Mistake (1.2): dropped the response helpers → 6 hand-written error shapes, one drifted (`status: false`).
  Lesson: duplication breeds inconsistency; centralize the response/error shape.
- Mistake (1.2b attempt): the helper `sendResponse(res, status, data)` only wrapped res.status().json(); callers still built `{success, data}` themselves and errors stayed hand-written.
  Lesson: a helper must own the shape (take `data`, or `code` + `message`), otherwise it doesn't prevent drift.
- Mistake (1.2): no commits during the task. Lesson: commit at each working checkpoint.
- Mistake (2.2): passed `{success, data}` into sendSuccess → double-wrapped envelope.
  Lesson: controllers pass raw data; only the helper builds the envelope.
- Mistake (2.2): used `DUPLICATE_CODE` instead of the specified `DEPARTMENT_CODE_EXISTS`.
  Lesson: error codes are part of the API contract; make them resource-specific.
- Mistake (2.1/2.2): again didn't commit per task. Lesson: commit at the end of every task.
- Mistake (2.3): forgot to import departmentRepository → ReferenceError → 500 on every valid POST; only tested the 400 paths.
  Lesson: test the happy path first (it runs every line); a linter (no-undef) catches this statically.
- Mistake (2.3): returned 404 DEPARTMENT_NOT_FOUND for a bad departmentId in the body (spec: 422 INVALID_DEPARTMENT).
- Mistake (2.3): normalized `code` inside findByCode as well as the controller → business rule in two places.
  Lesson: repositories do exact lookups; rules live in one layer.
- Mistake (2.3): inconsistent repo naming (findStudentById vs findById). Lesson: same interface across repositories.
- Mistake (3.1): typed `\conninfo` in fish after `\q`. Lesson: check the prompt; backslash commands exist only inside psql.
- Mistake (3.1): forgot `;` → next line appended to the buffer → syntax error; typed `psql ...` inside psql.
  Lesson: `-#` means psql is still waiting; `\r` clears it.
- Mistake (3.1): pasted `\r` and SQL onto one line → SQL swallowed as \r's arguments.
  Lesson: a backslash command consumes the rest of its line.
- Mistake (3.1): schema without DROP IF EXISTS / trailing `;` / FK index. Lesson: schema files must be re-runnable; index FK columns.
- Mistake (3.2): `order by name` unqualified in a join → works only while one selected column is called `name`; otherwise "ambiguous".
  Lesson: qualify every column in a multi-table query.
- Mistake (3.2): `order by id desc` for "newest". Lesson: sort by the column that carries the meaning (`created_at`), with `id` as tie-breaker.
- Mistake (3.2): UPDATE followed by `select *` instead of `RETURNING`; hard-coded `id = 1`; INSERT in a file meant to be re-run.
  Lesson: `RETURNING` for write results; practice files must be re-runnable (seed data in the seed, writes rolled back).
- Mistake (3.2): stopped at query 10; skipped the transaction and EXPLAIN parts. Lesson: check the acceptance criteria before handing in.
- Mistake (4.1): the tables disappeared mid-task (cause unknown, probably only the DROP line was run). Lesson: run schema.sql + seed.sql as whole files; a re-runnable schema makes recovery one command.
- Mistake (4.1): added dotenv and drizzle-kit although the task excluded them; empty `drizzle.config.js` inside `src/`. Kept by choice. Lesson: read the constraints; config files live in the project root.
- Mistake: `start` script used nodemon. Lesson: `start` = production command, no watchers.

## Patterns I understand
- Fail-fast startup: check the DB connection before `listen`, exit non-zero on failure (did this unprompted in 4.1)
- Defensive copies from repositories ({...obj}) so callers can't mutate stored state (did this unprompted in 2.3)
- Router + controller per resource; app.js only wires things together
- Normalize input before a uniqueness check
- Response helper as the single source of truth for the API envelope (sendSuccess/sendError)
- Early `return` from response helpers to avoid double-send; returning after registering async listeners

## Patterns I struggle with
- Finishing every acceptance criterion before handing a task in (3.2: transaction + EXPLAIN left out)
- psql/shell context switching (which prompt am I in?)
- Testing only the error paths and skipping the happy path
- Keeping earlier correctness (validation, id generation) when rewriting code in a new framework
- Committing regularly

## Completed tasks
- 4.1 Departments on Postgres via Drizzle (Kunal: install, client.js, startup check; Claude finished schema, repository, awaits, pool error listener, ADR 0003 on request; 2026-10-01)
- 3.2 SQL querying (Kunal: queries 1 to 10, JOINs/GROUP BY/HAVING correct; Claude completed transaction, EXPLAIN, notes on request; 2026-10-01). Phase 03 done.
- 3.1 Postgres role/db + schema + constraint experiments (Kunal: role, db, CREATE TABLEs; Claude completed the files on request + ADR 0002; 2026-09-30)
- 2.3 Repository layer + departmentId on students (fixes + ADR 0001 by Claude after review; pushed 2026-09-30)
- 2.2 Departments module (double-wrap fixed by Kunal; error-code rename by Claude on request; pushed 2026-09-30)
- 2.1 Student router/controller extraction (pure refactor, all checks passed)
- 1.2 / 1.2b Express migration (1.2b fixes applied by Claude on request, 2026-09-29; verified + pushed)
- 1.1 Raw node:http student server (all criteria passed; reviewed 2026-09-29)

## Pending tasks
- Phase 04 Task 4.2 (to be assigned): students on Postgres, map 23505/23503 to 409/422
- Answer the 4.1 scale questions: request 11 with a pool of 10; how many instances before max_connections

## Backend principles
- One crash affects all users: never let input crash the process or exhaust memory

## Interview-relevant concepts
- Why a repository layer (decoupling, swapping the storage) and what doesn't belong in it (HTTP, business rules)
- Why separate app from server (testability)
- Middleware order and 4-arg error middleware
- Status code semantics: 201 + created resource, 4xx vs 5xx
- Why constraints belong in the DB (check-then-insert races); SERIAL vs IDENTITY; why index FK columns
- INNER vs LEFT JOIN, count(*) vs count(col), WHERE vs HAVING, reading EXPLAIN ANALYZE, stale statistics (see docs/notes/phase-03-interview.md)

## System-design concepts learned
- Connections are a finite resource: instances × pool size must stay under Postgres max_connections (~100) → pooler (PgBouncer) beyond that
- In-process state breaks with >1 instance behind a load balancer → state must live outside the process (DB)
- Without an index, query cost grows linearly with table size (seq scan); an index keeps lookups ~flat
- Unbounded list queries (no LIMIT) exhaust app memory at scale → every list endpoint needs a bounded page size
