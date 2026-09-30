# Phase 01 — Interview Notes: Node + Express Fundamentals

Format: **likely question → crisp answer → where we saw it in the project.**

---

## 1. How does an HTTP server work in Node?

`http.createServer(handler)` starts a long-running process listening on a port. Node calls **one handler per request** with `req` (method, URL, headers, body stream) and `res` (status, headers, body). There's no built-in routing, so you branch on `req.method` and `pathname` yourself. The response is sent by `res.end()`. Forgetting it leaves the client hanging, and calling it twice throws.

**Seen in:** Task 1.1, the raw `node:http` server.

## 2. Why is the request body not just available as `req.body`?

The body arrives as a **stream** of chunks over TCP. Node doesn't block waiting for it. You register `data` / `end` listeners and your function returns immediately, and the chunks arrive later through the event loop. That non-blocking design is why one Node process can serve thousands of concurrent connections.

**Follow-up: "Why `Buffer.concat(chunks)` instead of `str += chunk`?"** A multi-byte UTF-8 character (`é`, `क`) can be split across two chunks. Decoding each chunk separately corrupts it, while concatenating the bytes first and decoding once is safe.

## 3. What is middleware in Express?

A function `(req, res, next)` in an **ordered pipeline**. Each one can modify `req`, end the response, or call `next()` to pass control on. **Order is behavior.**

```text
express.json() → routes → 404 handler → error handler
```

**Seen in:** a test route registered *after* the 404 middleware returned 404 instead of reaching its handler.

## 4. How does Express know a middleware is an error handler?

By its **arity**: exactly 4 parameters `(err, req, res, next)`. Drop `next` and Express treats it as a normal middleware, and errors skip it silently. It's reached via `next(err)` or a thrown error. In **Express 5**, rejected promises from `async` handlers are forwarded automatically. In **Express 4** they aren't, so you need wrappers or `try/catch`.

## 5. Why separate `app.js` from `server.js`?

**Testability.** `app.js` builds and exports the app, and `server.js` only calls `listen()`. Supertest imports `app` and fires requests in memory without opening a port, so there are no port conflicts and no leftover servers. It also gives startup concerns (DB connection, graceful shutdown) their own home.

## 6. Explain these status codes.

| Code | Meaning | Our example |
|---|---|---|
| **200** | OK | GET a student |
| **201** | Created, and return the created resource | POST student returns `{ id: 2, ... }` |
| **400** | Client sent a malformed request | `/api/students/abc`, bad JSON, missing name |
| **404** | Request is valid but the resource doesn't exist | `/api/students/99` |
| **413** | Payload too large | a body over 100kb |
| **500** | Server's fault | an unexpected thrown error |

- 4xx means **the client** must fix something, and 5xx means **we** must. Misreporting a client error as a 500 pollutes alerts and hides real outages.
- **400 vs 404 for `/students/abc`:** `abc` can never be a valid id (the request is malformed → 400). `99` is a valid id that doesn't exist (→ 404).

## 7. Why should an API have a consistent response format?

Clients write one parser, not one per endpoint:

```json
{ "success": true,  "data": { } }
{ "success": false, "error": { "code": "STUDENT_NOT_FOUND", "message": "..." } }
```

Machine-readable `code`s let the frontend branch on errors without parsing the message text.

**Seen in:** with 6 hand-written error objects, one drifted to `status: false`, and a client checking `!body.success` would have treated that error as success. The fix was one helper that **owns** the format (`sendSuccess` / `sendError`). A helper that just passes through whatever the caller builds doesn't prevent that drift.

## 8. What are common ways input can take down a server?

- **Unbounded buffering.** With no body size limit, a 200 MB POST pushed our process from **88 MB to 639 MB of memory**. A few of those concurrent requests will exhaust memory, the process dies, and **every** user is affected. Fix: an explicit limit (`express.json({ limit: "100kb" })`, which returns 413).
- **Uncaught exceptions.** In a raw server, a throw inside a callback crashes the whole process. Express's error pipeline turns it into a 500 for that one request.
- **Unguarded parsing.** `JSON.parse` without `try/catch`.

**Principle:** one Node process serves everyone, so one bad request must never crash it or exhaust its memory.

## 9. Who should generate resource IDs?

**The server** (later, the database via an identity column). If clients choose ids, you get collisions (we got two students with id 1) and races between concurrent creators.

## 10. How should errors be exposed to clients?

Log the full error and stack **server-side**. Send the client only a generic `INTERNAL_ERROR` / "Something went wrong". Stack traces leak file paths, library versions, and internal logic that help attackers.

## 11. Why is `req.body` sometimes `undefined`?

`express.json()` only parses requests whose `Content-Type` is `application/json`. In any other case, Express 5 leaves `req.body` as `undefined`, and destructuring it throws a TypeError. Guard with `req.body ?? {}` and return a 400, not a 500. **Never trust that the client sent what you expected.**

## 12. How should config and environment be handled?

Put config in environment variables, keep secrets out of git (`.env` in `.gitignore`), and load them explicitly (Node 22: `node --env-file=.env`). **Watch out for silent defaults:** `process.env.PORT || 3000` hid the fact that `.env` was never loaded. In production, prefer failing fast on missing required config.

**`npm start` vs `npm run dev`:** `start` is the production command (no file watcher). `dev` adds `--watch` for local reloads.

## 13. Why is "right for the wrong reason" code dangerous?

`Number.isInteger(id || id <= 0)` rejected `0` only by accident (`0 || true` evaluates to `true`) and let `-1` through. The code *looked* like it worked. **Test boundary values:** `0`, `-1`, `1.5`, `"abc"`, `"1e0"`, not just the happy path.

---

## One-line takeaways

1. Express is a routing layer plus an ordered middleware pipeline on top of `node:http`.
2. Middleware order is behavior. Error handlers need 4 parameters.
3. Bound every input. An unbounded buffer is a DoS.
4. 4xx means the client's fault and 5xx means ours. Never report one as the other.
5. Keep one response format, owned by one helper.
6. The server owns identity.
7. Log details internally and return generic messages externally.
8. Separate the app from the server for testability.
