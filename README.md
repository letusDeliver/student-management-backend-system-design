# Student Management System — Backend

A **Student Management System REST API** built from scratch as a hands-on way to learn professional backend engineering: API design, PostgreSQL, validation, error handling, concurrency, file uploads, testing, and system design.

The architecture is **grown one step at a time**. Each layer (routes, controllers, services, repositories, and so on) is added only after the code shows a real need for it.

## Status

| | |
|---|---|
| **Current phase** | Phase 02 — Project Structure |
| **Last completed** | Task 1.2: Migrated to Express 5 with 404 + centralized error middleware |
| **Next** | Phase 02: Project structure (routers and controllers) |

## Tech stack

| Area | Now | Planned |
|---|---|---|
| Runtime | Node.js 22 (ES modules) | |
| HTTP | Express 5 | |
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
npm run dev        # loads .env and starts with file watching on http://localhost:3000
npm start          # production start (no watcher)
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
| POST | `/api/students` | Create a student (`name`, `email` required; `id` is server-generated) | 201 (returns the created student) | 400 `INVALID_JSON`, 400 `VALIDATION_ERROR`, 413 `PAYLOAD_TOO_LARGE` |

Unknown routes return 404 `ROUTE_NOT_FOUND`. Unexpected failures return 500 `INTERNAL_ERROR` with a generic message; details are logged server-side only. Request bodies are limited to 100kb.

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
├── app.js                       # Express app: body parser, routes, in-memory store (exported, no listen)
├── server.js                    # Entry point: imports app and starts listening
├── middlewares/
│   ├── notFoundMiddleware.js    # 404 for unmatched routes
│   └── errorMiddleware.js       # Maps errors to safe JSON responses
└── utils/
    └── apiResponse.js           # sendSuccess / sendError, the single source of the response shape
```

`app.js` and `server.js` are separate so tests can import the app without opening a port.

## Roadmap

- [x] 01 — Node + Express fundamentals
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
- Email format isn't validated and duplicate emails are allowed (planned: Zod + a UNIQUE constraint).
- All routes live in `app.js` (planned: routers/controllers in Phase 02).
- No automated tests yet (planned: Phase 15).
