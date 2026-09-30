# Phase 02 — Interview Notes: Project Structure

Format: **likely question → crisp answer → where we saw it in the project.**

---

## 1. Why split an Express app into routes and controllers?

To split **concerns** as the codebase grows. `app.js` only wires things together (global middleware, mounting, error handling). A **router** maps URLs to handlers for one resource. A **controller** reads `req`, does the work and responds. One file per resource means two people can work on students and departments without merge conflicts, and you know where to look. It doesn't make anything faster. It scales the *code and the team*, not the traffic.

**Seen in:** Task 2.1. `app.js` went from ~70 lines of mixed logic to a handful of `app.use(...)` lines.

## 2. How does `express.Router` work?

A router is a mini-app with its own middleware and routes, but no server. You mount it once with a prefix, and the paths inside are **relative**:

```js
app.use("/api/students", studentRoutes);  // prefix lives here only
router.get("/:id", getStudentById);       // → GET /api/students/:id
```

**Classic bugs:** repeating the prefix inside the router (`/api/students/api/students`), mounting after the 404 middleware (everything 404s), and writing `router.get("/", handler())`, which calls the function at import time instead of passing it.

## 3. What is the repository pattern and why use it?

A repository is a module that **owns one resource's data** and exposes functions (`findAll`, `findById`, `create`, `findByCode`). It hides *how* the data is stored. Controllers call it and never touch the storage.

- **Decoupling:** the student controller needed department data. Importing another controller's array would have coupled two HTTP modules and let anyone mutate the data.
- **Swappable storage:** when in-memory arrays become PostgreSQL + Drizzle, only `repositories/` changes.

**Seen in:** Task 2.3 and [ADR 0001](../adr/0001-repository-layer.md).

## 4. What should *not* go in a repository?

- **HTTP concerns:** no `req`, `res` or status codes. A miss returns `undefined`, and the controller decides whether that's a 404, a 422 or something else.
- **Business rules / input normalization:** "codes are uppercase" belongs in one layer. We had normalization in both the controller and `findByCode`, which put the rule in two places.
- **Exported raw data:** the array stays private. We also return **shallow copies** so callers can't mutate stored state through a returned object.

## 5. Which way should dependencies point in a layered app?

One way: `routes → controllers → repositories → storage`. A controller may use **several** repositories (the student controller uses both). A repository never imports a controller, Express or response helpers. Arrows that point back create coupling and, eventually, circular imports.

## 6. Explain 400 vs 404 vs 409 vs 422.

| Code | Meaning | Our example |
|---|---|---|
| 400 | Malformed request (wrong type, missing field) | `departmentId: "1"` → `VALIDATION_ERROR` |
| 404 | The **URL target** doesn't exist | `GET /api/departments/99` → `DEPARTMENT_NOT_FOUND` |
| 409 | Valid request, but it **conflicts with current state** | duplicate department code → `DEPARTMENT_CODE_EXISTS` |
| 422 | Well-formed body that **references something invalid** | `departmentId: 999` → `INVALID_DEPARTMENT` |

**Why not 404 for `departmentId: 999`?** `/api/students` exists. A 404 there tells clients and gateways "wrong endpoint". Some APIs use 400 instead of 422; either is defensible, and what matters is being consistent.

## 7. Why are error codes like `DEPARTMENT_CODE_EXISTS` part of the API contract?

Clients branch on `error.code` programmatically, for example to show "that code is taken" under the right form field. Renaming it breaks them just like renaming a URL. Generic codes (`DUPLICATE_CODE`) become ambiguous once several resources have codes.

## 8. Why normalize before checking uniqueness?

If you store `"CSE"` but compare the raw input `"cse"`, the check misses and you get duplicates that only differ by case or whitespace. Normalize first (`trim().toUpperCase()`), then compare **and** store the normalized value. The database version of this is a UNIQUE constraint on a normalized column, coming in Phase 03/04.

## 9. Why does data kept in a module-level variable persist between requests, and why is that a problem in production?

ES modules are **evaluated once and cached**. Every importer gets the same instance, so a module-level array is a per-process singleton.

- **Restart or deploy:** all data is lost.
- **Two instances behind a load balancer:** each process has its own array. A `POST` goes to instance A and the following `GET` hits instance B and returns 404.

The fix is to keep state **outside the process** (a database). That's why Phase 03 is PostgreSQL.

## 10. Your server started fine but every create request returned 500. Why?

ESM checks `import` statements when the module loads, but a **missing import** of something you then use is just an undefined identifier. It throws `ReferenceError` only when that line runs. Our validation-error tests passed because they returned before that line.

**Lessons:** test the **happy path first**, because it runs every line. A linter (`no-undef`) catches this before runtime. Always read the server log for a 500.

**Seen in:** Task 2.3, where `departmentRepository` was used without being imported in the student controller.

## 11. When should you extract duplicated code?

When you understand the abstraction, which is often at the third copy (the "rule of three"). We have id parsing and find-or-404 duplicated in two controllers. We're deliberately waiting until PUT/DELETE add more copies, because extracting too early bakes in the wrong shape.

## 12. What's an ADR?

An **Architecture Decision Record**: a short document (Context / Decision / Consequences) recording *why* a structural choice was made, including its costs and what it doesn't solve. Months later, "why do we have repositories?" has a written answer instead of folklore.

**Seen in:** `docs/adr/0001-repository-layer.md`.

---

## Scale check: 10 → 1k → 100k users

| Scale | What breaks | Fix |
|---|---|---|
| 10 | Nothing. The structure is cosmetic here. | — |
| 1k | Running more than one instance splits the in-memory data; restarts wipe it. | PostgreSQL (Phase 03) |
| 100k | `array.find()` is a linear scan on every lookup. | Primary-key / unique indexes; the repository hides the swap |
