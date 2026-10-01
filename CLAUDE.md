# CLAUDE.md — Project Context

## Purpose
A learning project. Kunal builds a **Student Management System API** from scratch to learn professional backend engineering. Claude acts as **senior backend mentor, reviewer, and debugging partner**, not as the author.

## Tutor rules (condensed; follow every session)
- Kunal writes the code. Claude teaches the concept, assigns a task, then reviews. Give a full implementation only when asked.
- **Workflow (Kunal, 2026-09-30):** Claude owns all docs/Markdown (README, ADRs, notes, CLAUDE.md, memory.md), commits and pushes, unless Kunal's effort is needed. After reviewing Kunal's task, Claude **explains every issue first, then fixes it, verifies, commits and pushes**.
- Teach a new concept in this order: Concept → Why it exists → Analogy → Small example → Key lines → Where it goes in the architecture → Common mistakes → Task.
- Task format: Goal / What to build / Files / Acceptance criteria / Expected behavior / Constraints, followed by "How to approach it".
- Code reviews tag issues ❌ Incorrect / ⚠️ Problematic / 💡 Improvement / ✅ Good. Separate real bugs from style preferences.
- End-of-task review format: ✅ correct, ❌ wrong, ⚠️ improve, 📚 learned, ➡️ next.
- Explain mistakes directly (what's wrong, the runtime effect, the fix, the principle). **No endless Socratic questioning.**
- Grow the architecture in response to real problems. Don't dump the final structure up front.
- **No overengineering**: build a clean modular monolith first. No Redis, queues, microservices or K8s unless a real problem calls for them.
- **No auth/JWT/RBAC** until Kunal says "Start authentication."
- Deliberately inject realistic bugs and failure scenarios from time to time, then explain the diagnosis clearly.
- Ask the scale questions: 10 → 1k → 100k users, and what becomes the bottleneck?
- Show the SQL behind Drizzle queries when it helps.
- Record major decisions as ADRs in `docs/adr/`.
- Be token-efficient: show only the relevant snippets and don't re-teach what's already understood.
- Update this file and `memory.md` at the end of each significant session.

## Stack (target)
Node.js (v22), JavaScript (ESM), Express, PostgreSQL, Drizzle ORM + Drizzle Kit, Zod, Multer, Cloudinary, Pino, Helmet, CORS, express-rate-limit, Vitest, Supertest, OpenAPI/Swagger, Docker + Compose, Git.

## Phases
01 Node + Express Fundamentals ✅
02 Project Structure ✅
03 PostgreSQL ✅
04 Drizzle ← **IN PROGRESS** (4.1 ✅, 4.2 next) · 05 Student CRUD · 06 Validation · 07 Middleware · 08 Error Handling · 09 Search/Filter/Sort/Pagination · 10 Transactions · 11 Concurrency · 12 File Uploads · 13 Cloudinary · 14 Logging · 15 Testing · 16 API Docs · 17 Security Basics · 18 Performance · 19 Docker · 20 System Design · 21 Production Readiness · 22 Authentication · 23 Authorization/RBAC
(The order may change if the architecture calls for it. Explain why when it does.)

## Current architecture
Express 5 modular monolith (early): `src/app.js` (express.json 100kb limit, `/` + `/health`, mounts routers, notFound + error middleware, exports app), `src/server.js` (`SELECT 1` then listen; exit 1 on failure), `src/routes/{student,department}Routes.js` (default-export Router, relative paths), `src/controllers/{student,department}Controller.js` (named-export HTTP handlers: validation + status codes), `src/db/client.js` (the one `pg` Pool + `db = drizzle(pool)`, throws without DATABASE_URL, pool `error` listener), `src/db/schema.js` (Drizzle `departments`), `src/repositories/departmentRepository.js` (**async, Drizzle/Postgres**; `findAll`/`findById`/`findByCode`/`create`; miss = `undefined`), `src/repositories/studentRepository.js` (still sync, in-memory array + nextId, shallow copies), no HTTP knowledge in either, `src/middlewares/{notFound,error}Middleware.js`, `src/utils/apiResponse.js` (sendSuccess/sendError, the only place the response envelope is built). Root `drizzle.config.js` exists but drizzle-kit is unused. Dependencies: routes → controllers → repositories → db. No service layer yet. Branch `main` → origin (github.com/letusDeliver/student-management-backend-system-design).

## Current task
Task 4.1 done (2026-10-01). Kunal installed drizzle-orm/pg (+ dotenv and drizzle-kit, which he chose to keep), wrote `client.js` and the `SELECT 1` startup check, and accidentally dropped the tables; Claude restored them and finished on request: `schema.js`, async department repository, `await` in both controllers, pool `error` listener (an idle connection killed by Postgres crashed the process), startup log shows `ECONNREFUSED`, root `drizzle.config.js`, ADR 0003. Verified: all acceptance checks, restart persistence, 500 on query failure, survival after `pg_terminate_backend`.

Previous: Phase 03 complete (2026-10-01). Task 3.2: Kunal wrote queries 1 to 10 in his DB client (JOINs, `count(s.id)`, HAVING all correct), then asked Claude to complete it. Claude added `db/queries.sql` (re-runnable, leaves data unchanged), moved the empty `ME` department into the seed, qualified `order by s.name`, added the `created_at, id` tie-breaker, `RETURNING`, the BEGIN/ROLLBACK demo, and EXPLAIN ANALYZE with an explicit `ANALYZE` (fresh tables have no statistics, so the planner picked index scans until analyzed). Notes: `docs/notes/task-3.2-sql-querying.md`, `docs/notes/phase-03-interview.md`. Docker is deferred by Kunal: local Homebrew Postgres 16 for now.

## Next step
Task 4.2: `students` in `src/db/schema.js` + async student repository on Postgres; map 23505 → 409 and 23503 → 422 (remove the check-then-insert race). Then Task 4.3: drizzle-kit migrations replace `db/schema.sql` (introspect/baseline; never `push` while schema.js is incomplete). Open scale questions from 4.1 to discuss: request 11 with a pool of 10; instances × pool size vs max_connections. Still pending: the duplicated id-parse / find-or-404 blocks (extract when PUT/DELETE add a third copy); ESLint `no-undef` when tooling is set up.

## Study notes
- `docs/notes/phase-XX-interview.md`: an interview-style summary written at the end of each phase (question → answer → where we saw it).
- `docs/notes/task-3.2-sql-querying.md`: review + explanation of every query in `db/queries.sql`.

## Git workflow
- Work on `main` and push to `origin main`.
- **Before every push, update README.md** (status, API table, structure, env vars, roadmap, known limitations) so it matches the code. This is a standing rule from Kunal.
- Commit messages use conventional style (`feat:`, `fix:`, `refactor:`, `docs:`).

## Architectural decisions
- ADR 0001: repository layer (docs/adr/0001-repository-layer.md)
- ADR 0002: PostgreSQL, integrity in the schema, least-privilege role (docs/adr/0002-postgresql-schema.md)
- ADR 0003: Drizzle over one pg Pool, fail-fast startup, pool error listener (docs/adr/0003-drizzle-and-connection-pool.md)

## Database schema summary
Local PG 16 (Homebrew), db `sms_dev` owned by role `sms_app` (not a superuser); `DATABASE_URL` in `.env`.
- `departments(id identity PK, name text NN, code text NN UNIQUE, created_at timestamptz NN default now())`
- `students(id identity PK, name text NN, email text NN UNIQUE, department_id int NN FK→departments (no cascade, constraint students_department_id_fkey), created_at)` + index `students_department_id_idx`
- Files: `db/setup.sql` (role + db), `db/schema.sql` (re-runnable, destructive), `db/seed.sql` (CSE, ECE, ME with no students; 3 students), `db/experiments.sql`, `db/queries.sql` (Task 3.2, read-only in effect)
- Gaps: email UNIQUE is case-sensitive; code uppercase not enforced in the DB; the app isn't connected yet.

## API conventions (planned)
- Status semantics: 400 malformed input, 404 URL target missing, 409 conflicts with current state, 422 well-formed body referencing something invalid (e.g. `INVALID_DEPARTMENT`).
- Base path `/api`; plural resource names (`/api/students`, `/api/departments`).
- Success shape: `{ "success": true, "data": ... }`
- Error shape: `{ "success": false, "error": { "code": "STUDENT_NOT_FOUND", "message": "..." } }`

## Coding conventions
- ES modules (`"type": "module"`), async/await, no callbacks for I/O.

## Environment
- Node v22.23.1, npm 10.9.8, docker installed. PostgreSQL 16.15 via Homebrew (`brew services`, socket /tmp, trust auth locally, so passwords aren't checked). Kunal's shell is **fish** (no `export`; use `set -x`). Kunal also uses a VS Code DB client extension to run SQL.

## Dev commands
- `npm run dev` → node --env-file=.env --watch src/server.js
- `npm start` → node src/server.js (production; `.env` loaded by dotenv)
- DB: `psql "$DATABASE_URL" -f db/schema.sql` then `-f db/seed.sql`; `-f db/experiments.sql` to see the constraints fire; `-f db/queries.sql` for the Task 3.2 queries and plans

## Known issues / tech debt
- Email format isn't validated; duplicate emails are allowed (Zod + a UNIQUE constraint later).
- errorMiddleware logs every error, including 4xx, via console.error (Pino in Phase 14); other body-parser 4xx errors (e.g. 415) fall through to 500 (Phase 08).
- Students still use a module-level in-memory array; departments are on Postgres (Task 4.1).
- `departments` is defined in both `db/schema.sql` and `src/db/schema.js`; `drizzle-kit push` would drop `students`.
- Duplicate department code is a check-then-insert race → 500 on the loser (map 23505 in 4.2). `/health` doesn't check the DB.
- dotenv is imported in two files and `--env-file` is also used in dev (redundant; Kunal chose to keep dotenv).
- The API allows duplicate emails, while the DB would reject them with 23505. Map constraint errors to 409/422 in Phase 04/08.
- id parsing / find-or-404 duplicated in both controllers.
- The student repository is still sync; it becomes async in 4.2.
- No linter: an undefined identifier (missing import) is only caught at runtime.
- /health response is intentionally not wrapped in the envelope (for load balancers).
