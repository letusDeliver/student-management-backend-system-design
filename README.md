# Student Management System — Backend

A **Student Management System REST API** built from scratch as a hands-on way to learn professional backend engineering: API design, PostgreSQL, validation, error handling, concurrency, file uploads, testing, and system design.

The architecture is **grown one step at a time**. Each layer (routes, controllers, services, repositories, and so on) is added only after the code shows a real need for it.

## Status

| | |
|---|---|
| **Current phase** | Phase 04 — Drizzle ORM |
| **Last completed** | Task 4.1: departments served from PostgreSQL through Drizzle and a `pg` connection pool |
| **Next** | Task 4.2: students on PostgreSQL, constraint errors (`23505` / `23503`) mapped to 409 / 422 |

## Tech stack

| Area | Now | Planned |
|---|---|---|
| Runtime | Node.js 22 (ES modules) | |
| HTTP | Express 5 | |
| Database | PostgreSQL 16 via `pg` pool + Drizzle ORM (departments) · in-memory array (students) | Students on PostgreSQL, Drizzle Kit migrations |
| Validation | Manual checks | Zod |
| Files | — | Multer + Cloudinary |
| Logging | `console` | Pino |
| Security | — | Helmet, CORS, express-rate-limit |
| Testing | — | Vitest + Supertest |
| Docs | — | OpenAPI / Swagger |
| Infra | — | Docker + Docker Compose |

## Getting started

**Requirements:** Node.js 22+, PostgreSQL 16+ (local; Docker comes in Phase 19)

```bash
git clone https://github.com/letusDeliver/student-management-backend-system-design.git
cd student-management-backend-system-design
npm install
npm run dev        # loads .env and starts with file watching on http://localhost:3000
npm start          # production start (no watcher)
```

**Database setup** (required: the server checks the connection at startup and exits if it fails):

```bash
cp .env.example .env                      # then set your own password in DATABASE_URL
psql -d postgres -f db/setup.sql          # as a superuser: creates role sms_app + database sms_dev (edit the password first)
psql "$DATABASE_URL" -f db/schema.sql     # re-runnable: drops and recreates tables (destroys data)
psql "$DATABASE_URL" -f db/seed.sql       # 3 departments (ME has no students), 3 students
psql "$DATABASE_URL" -f db/experiments.sql  # every constraint rejecting bad data, with SQLSTATE codes
psql "$DATABASE_URL" -f db/queries.sql    # JOINs, aggregates, a rolled-back transaction, EXPLAIN ANALYZE (one expected error: 23503)
```

In fish, run `set -x DATABASE_URL ...` first, or paste the URL directly.

**Environment variables** (in a `.env` file, which is gitignored):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the HTTP server listens on |
| `DATABASE_URL` | none | `postgres://sms_app:<password>@localhost:5432/sms_dev` (required; the server refuses to start without it) |

## API

Base URL: `http://localhost:3000`

| Method | Path | Description | Success | Errors |
|---|---|---|---|---|
| GET | `/health` | Health check | 200 | |
| GET | `/api/students` | List all students | 200 | |
| GET | `/api/students/:id` | Get one student | 200 | 400 `INVALID_ID`, 404 `STUDENT_NOT_FOUND` |
| POST | `/api/students` | Create a student (`name`, `email`, `departmentId` required; `departmentId` must be a positive integer referencing an existing department; `id` is server-generated) | 201 (returns the created student) | 400 `INVALID_JSON`, 400 `VALIDATION_ERROR`, 422 `INVALID_DEPARTMENT`, 413 `PAYLOAD_TOO_LARGE` |
| GET | `/api/departments` | List all departments (from PostgreSQL; includes `createdAt`) | 200 | |
| GET | `/api/departments/:id` | Get one department | 200 | 400 `INVALID_ID`, 404 `DEPARTMENT_NOT_FOUND` |
| POST | `/api/departments` | Create a department (`name`, `code` required; `code` is trimmed and uppercased, must be unique) | 201 (returns the created department) | 400 `INVALID_JSON`, 400 `VALIDATION_ERROR`, 409 `DEPARTMENT_CODE_EXISTS`, 413 `PAYLOAD_TOO_LARGE` |

`422 INVALID_DEPARTMENT` means the body is well-formed but references a department that doesn't exist (404 is reserved for URLs that don't exist).

Unknown routes return 404 `ROUTE_NOT_FOUND`. Unexpected failures return 500 `INTERNAL_ERROR` with a generic message; details are logged server-side only. Request bodies are limited to 100kb.

### Response format

```json
{ "success": true, "data": { "id": 1, "name": "Kunal", "email": "kunal@example.com", "departmentId": 1 } }
```

```json
{ "success": false, "error": { "code": "STUDENT_NOT_FOUND", "message": "Student not found" } }
```

### Example

```bash
curl -X POST localhost:3000/api/students \
  -H 'Content-Type: application/json' \
  -d '{"name":"Asha","email":"asha@example.com","departmentId":1}'
```

## Project structure

```text
src/
├── app.js                       # Express app: body parser, mounts routers, 404 + error middleware (exported, no listen)
├── server.js                    # Entry point: checks the DB connection, then starts listening
├── routes/
│   ├── studentRoutes.js         # /api/students → student controller
│   └── departmentRoutes.js      # /api/departments → department controller
├── controllers/
│   ├── studentController.js     # Student HTTP handlers (validation, status codes)
│   └── departmentController.js  # Department HTTP handlers
├── repositories/
│   ├── studentRepository.js     # Student data access (in-memory for now)
│   └── departmentRepository.js  # Department data access (PostgreSQL via Drizzle, async)
├── middlewares/
│   ├── notFoundMiddleware.js    # 404 for unmatched routes
│   └── errorMiddleware.js       # Maps errors to safe JSON responses
├── db/
│   ├── client.js                # The one pg Pool + Drizzle instance; fails fast without DATABASE_URL
│   └── schema.js                # Drizzle table definitions (departments so far)
└── utils/
    └── apiResponse.js           # sendSuccess / sendError, the single source of the response shape
drizzle.config.js                # drizzle-kit config (not used yet; do not run `drizzle-kit push`)
```

```text
db/
├── setup.sql                    # Role sms_app + database sms_dev (run once as a superuser)
├── schema.sql                   # departments, students: PK, NOT NULL, UNIQUE, FK, FK index
├── seed.sql                     # Development data
├── experiments.sql              # Statements that must fail (23505 / 23503 / 23502 / 428C9)
└── queries.sql                  # Filtering, JOINs, GROUP BY, RETURNING, transactions, query plans (leaves data unchanged)
```

### Database schema

| Table | Column | Type | Rules |
|---|---|---|---|
| `departments` | `id` | integer | PK, `GENERATED ALWAYS AS IDENTITY` |
| | `name` | text | NOT NULL |
| | `code` | text | NOT NULL, UNIQUE |
| | `created_at` | timestamptz | NOT NULL, default `now()` |
| `students` | `id` | integer | PK, `GENERATED ALWAYS AS IDENTITY` |
| | `name` | text | NOT NULL |
| | `email` | text | NOT NULL, UNIQUE (case-sensitive) |
| | `department_id` | integer | NOT NULL, FK → `departments(id)`, no cascade; indexed |
| | `created_at` | timestamptz | NOT NULL, default `now()` |

See [ADR 0002](docs/adr/0002-postgresql-schema.md). The queries are explained in [docs/notes/task-3.2-sql-querying.md](docs/notes/task-3.2-sql-querying.md).

`app.js` and `server.js` are separate so tests can import the app without opening a port.

Each resource has a **router** (URL → handler map, relative paths, mounted once in `app.js` under its prefix) and a **controller** (reads `req`, does the work, responds via `apiResponse`). Controllers never touch data directly; they call a **repository** (`findAll` / `findById` / `create`, …), which owns the storage and knows nothing about HTTP. Dependencies point one way: routes → controllers → repositories → `db/`. See [ADR 0001](docs/adr/0001-repository-layer.md) and [ADR 0003](docs/adr/0003-drizzle-and-connection-pool.md).

Architectural decisions are recorded in [`docs/adr/`](docs/adr/). Interview-style notes for each phase are in [`docs/notes/`](docs/notes/).

## Roadmap

- [x] 01 — Node + Express fundamentals
- [x] 02 — Project structure (routes / controllers / repositories)
- [x] 03 — PostgreSQL (schema, constraints, SQL querying)
- [ ] 04 — Drizzle ORM (4.1 departments ✅)
- [ ] 05 — Student & Department CRUD
- [ ] 06 — Validation (Zod)
- [ ] 07 — Middleware
- [ ] 08 — Centralized error handling
- [ ] 09 — Search, filtering, sorting, pagination
- [ ] 10 — Transactions
- [ ] 11 — Concurrency
- [ ] 12 — File uploads (Multer)
- [ ] 13 — Cloudinary integration
- [ ] 14 — Structured logging (Pino)
- [ ] 15 — Testing (Vitest + Supertest)
- [ ] 16 — API documentation (OpenAPI)
- [ ] 17 — Security basics
- [ ] 18 — Performance
- [ ] 19 — Docker
- [ ] 20 — System design
- [ ] 21 — Production readiness
- [ ] 22 — Authentication
- [ ] 23 — Authorization / RBAC

## Known limitations

- Students are still stored in a module-level array: lost on restart, not shared between instances, and their `departmentId` is not protected by the foreign key yet. Departments are in PostgreSQL.
- Duplicate department codes are caught by a check-then-insert, which two simultaneous requests can both pass; the second then gets a 500 from the UNIQUE constraint instead of a 409 (Task 4.2).
- `/health` doesn't check the database, so it reports `ok` during a database outage.
- The `departments` table is defined in both `db/schema.sql` and `src/db/schema.js` and kept in sync by hand.
- Email format isn't validated, and the API allows duplicate emails (the DB schema has `UNIQUE (email)`, but it's case-sensitive).
- Database setup is manual SQL files. No migrations yet; `drizzle-kit` is installed but unused, and `drizzle-kit push` would drop the `students` table.
- The id-parsing and find-or-404 logic is duplicated across controllers (to be extracted once the right abstraction is clear).
- Deleting departments isn't supported yet; once it is, it must handle students that still reference the department (the DB foreign key already blocks it; the API must map that to a 409).
- No automated tests yet (planned: Phase 15).
