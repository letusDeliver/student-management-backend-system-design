# ADR 0001: Introduce a repository layer

- **Status:** Accepted
- **Date:** 2026-09-30
- **Phase:** 02, Task 2.3

## Context

Each controller kept its resource's data in a module-level array. Task 2.3 made students reference departments (`departmentId`), so `studentController` had to check whether a department exists. The data it needed was private to `departmentController`.

The obvious alternatives were both poor:

- **Export the array from `departmentController`.** One HTTP module would depend on another's internals, and any importer could mutate or replace the data.
- **Duplicate the lookup in `studentController`.** There would be two sources of truth for one rule.

The in-memory arrays are also temporary. Phase 03/04 replaces them with PostgreSQL + Drizzle, and that change shouldn't ripple through every controller.

## Decision

Add `src/repositories/`, one module per resource (`studentRepository`, `departmentRepository`), that owns the data and exposes only functions:

- `findAll()`, `findById(id)`, `create(data)`, plus resource-specific lookups (`findByCode(code)`).
- The data arrays are **not exported**. Returned objects are shallow copies, so callers can't mutate stored state.
- Repositories have **no HTTP knowledge**: they don't import Express, `apiResponse` or any controller. A miss returns `undefined`, and the controller decides which status code that means.
- Input validation and business rules (trimming, uppercasing codes) stay in the controller. Repositories do exact lookups.
- Dependencies point one way: `routes → controllers → repositories`. A controller may use several repositories.
- Function names are the same across repositories (`findAll` / `findById` / `create`) so the interface is predictable.

## Consequences

- **Good:** controllers share data without coupling to each other, and the storage swap in Phase 04 touches only `repositories/`.
- **Good:** there's one obvious place to look for "how is X stored and queried".
- **Cost:** one more file per resource, plus a layer of indirection for trivial reads.
- **Not solved yet:** repositories are synchronous. Drizzle queries are async, so in Phase 04 the functions will return Promises and controllers will need `await`. That will be a small, mechanical change.
- **Not solved yet:** there's no service layer. If business logic starts spanning several repositories (for example transactions in Phase 10), a `services/` layer may be justified. That would be decided in a new ADR.
