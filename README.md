# Student Management System — Backend

A **Student Management System REST API** built from scratch as a hands-on way to learn professional backend engineering: API design, PostgreSQL, validation, error handling, concurrency, file uploads, testing, and system design.

The architecture is **grown one step at a time**. Each layer (routes, controllers, services, repositories, and so on) is added only after the code shows a real need for it.

## Status

| | |
|---|---|
| **Current phase** | Phase 01 — Node + Express Fundamentals |
| **Last completed** | Task 1.1: Raw `node:http` server with an in-memory student store |
| **In progress** | Task 1.2: Migrating to Express 5 |

## Tech stack

| Area | Now | Planned |
|---|---|---|
| Runtime | Node.js 22 (ES modules) | |
| HTTP | `node:http` | Express 5 |
| Database | In-memory array | PostgreSQL + Drizzle ORM / Drizzle Kit |
| Validation | Manual checks | Zod |
| Files | — | Multer + Cloudinary |
| Logging | `console` | Pino |
| Security | — | Helmet, CORS, express-rate-limit |
| Testing | — | Vitest + Supertest |
| Docs | — | OpenAPI / Swagger |
| Infra | — | Docker + Docker Compose |

## Getting started

**Requirements:** Node.js 22+

```bash
git clone https://github.com/letusDeliver/student-management-backend-system-design.git
cd student-management-backend-system-design
npm install
npm run dev        # starts with file watching on http://localhost:3000
```

**Environment variables** (in a `.env` file, which is gitignored):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the HTTP server listens on |

## API

Base URL: `http://localhost:3000`

| Method | Path | Description | Success | Errors |
|---|---|---|---|---|
| GET | `/health` | Health check | 200 | |
| GET | `/api/students` | List all students | 200 | |
| GET | `/api/students/:id` | Get one student | 200 | 400 `INVALID_ID`, 404 `STUDENT_NOT_FOUND` |
| POST | `/api/students` | Create a student (`name`, `email` required) | 201 | 400 `INVALID_JSON`, 400 `VALIDATION_ERROR` |

Unknown routes return 404 `ROUTE_NOT_FOUND`.

### Response format

```json
{ "success": true, "data": { "id": 1, "name": "Kunal", "email": "kunal@example.com" } }
```

```json
{ "success": false, "error": { "code": "STUDENT_NOT_FOUND", "message": "Student not found" } }
```

### Example

```bash
curl -X POST localhost:3000/api/students \
  -H 'Content-Type: application/json' \
  -d '{"name":"Asha","email":"asha@example.com"}'
```

## Project structure

```text
src/
└── server.js      # HTTP server, routing, and in-memory store (to be split up as the project grows)
```

## Roadmap

- [ ] 01 — Node + Express fundamentals *(in progress)*
- [ ] 02 — Project structure (routes / controllers / services)
- [ ] 03 — PostgreSQL
- [ ] 04 — Drizzle ORM
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

- Data is stored in memory and is lost on restart.
- There is no request body size limit yet.
- `.env` is not loaded yet, so `PORT` always falls back to 3000.
