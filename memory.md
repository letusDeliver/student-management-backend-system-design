# memory.md — Kunal's Learning Progress

## Concepts learned
- Raw node:http: one handler per request; routing is manual branching on method/pathname
- Request body is a stream (data/end events); Buffer.concat beats string += (multi-byte safety)
- 400 (malformed input) vs 404 (valid request, missing resource)
- Express: express.json({limit}), 4-arg error middleware, 404 middleware, body-parser error types
- app.js/server.js split → tests import app without listening (Supertest)

## Currently learning
- Next: Phase 02, project structure (express.Router, controllers)

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
- Mistake: `start` script used nodemon. Lesson: `start` = production command, no watchers.

## Patterns I understand
- Response helper as the single source of truth for the API envelope (sendSuccess/sendError)
- Early `return` from response helpers to avoid double-send; returning after registering async listeners

## Patterns I struggle with
- Keeping earlier correctness (validation, id generation) when rewriting code in a new framework
- Committing regularly

## Completed tasks
- 1.2 / 1.2b Express migration (1.2b fixes applied by Claude on request, 2026-09-29; verified + pushed)
- 1.1 Raw node:http student server (all criteria passed; reviewed 2026-09-29)

## Pending tasks
- Phase 02 Task 2.1 (to be assigned)

## Backend principles
- One crash affects all users: never let input crash the process or exhaust memory

## Interview-relevant concepts
- Why separate app from server (testability)
- Middleware order and 4-arg error middleware
- Status code semantics: 201 + created resource, 4xx vs 5xx

## System-design concepts learned
(none yet)
