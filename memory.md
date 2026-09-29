# memory.md — Kunal's Learning Progress

## Concepts learned
- Raw node:http: one handler per request; routing is manual branching on method/pathname
- Request body is a stream (data/end events); Buffer.concat beats string += (multi-byte safety)
- 400 (malformed input) vs 404 (valid request, missing resource)

## Currently learning
- Express: routing, middleware pipeline, 404 + error middleware, app/server split

## Mistakes & lessons
- Mistake: buffered the request body with no size limit (a 200MB POST pushed RSS from 88MB to 639MB).
  Lesson: every input needs an explicit bound; unbounded buffering is a trivial DoS.
- Mistake: installed dotenv + created .env but never loaded it; PORT silently fell back to the default.
  Lesson: config should fail loudly; use `node --env-file`. Default values can hide misconfiguration.
- Mistake: `start` script used nodemon. Lesson: `start` = production command, no watchers.

## Patterns I understand
- Early `return` from response helpers to avoid double-send; returning after registering async listeners

## Patterns I struggle with
(none yet)

## Completed tasks
- 1.1 Raw node:http student server (all criteria passed; reviewed 2026-09-29)

## Pending tasks
- 1.2 Rebuild in Express (app.js/server.js split, 404 + error middleware)

## Backend principles
- One crash affects all users: never let input crash the process or exhaust memory

## Interview-relevant concepts
(none yet)

## System-design concepts learned
(none yet)
