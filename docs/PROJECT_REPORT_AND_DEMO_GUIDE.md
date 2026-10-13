# SAP-SMS-MERN Project Report and Demo Guide

## Project title

**SAP-SMS — Student Academic Planner and Student Management System**

## Executive summary

SAP-SMS is a MERN application for a student to organize subjects, class schedules, assignments, campus events, and attendance. An authenticated user works with their own records through a React single-page application and an Express JSON API. MongoDB stores account and academic data. The application also offers a dashboard, browser push preferences, and reminder processing.

This report describes the repository at P4 commit `3c52ff734f197d4649247e1fe057ed3530211f08`, based on source inspection and checks run locally on 2026-10-10. The frontend production build, backend security/configuration tests, frontend pagination tests, backend JavaScript syntax checks, P3 database preflight, and P3 API integration suite passed. The built frontend shell also returned HTTP 200 from a local Vite preview. No interactive browser automation was available, and no normal backend was started because its ordinary environment configuration could point to a non-test database. Thus, UI workflows with a human account, real push delivery, and deployment behavior still need manual verification.

## Problem statement, objectives, scope, and users

Students often keep class schedules, assignments, events, and attendance in separate places. SAP-SMS combines these academic planning workflows in one account-scoped interface. The main objectives visible in the implementation are:

- Manage subjects and associate attendance, timetable entries, and tasks with them.
- Record attendance and calculate useful attendance targets.
- Track tasks, due dates, status, priorities, and events.
- Show a dashboard summary and support paginated lists.
- Protect account data with authentication, validation, and ownership-scoped database operations.
- Optionally register browser push subscriptions and process academic reminders.

The application serves student accounts. The code also recognizes explicit administrative roles in authorization middleware, but the ordinary academic workflows inspected here are student-facing. The repository does not establish institution-specific deployment, number of users, performance measurements, or a production service-level target; none are assumed in this report.

## Architecture and verified technology stack

The application is a MERN-style client/server system:

| Layer | Verified implementation | Responsibility |
|---|---|---|
| Frontend | React 18, React Router, Axios, Vite, Tailwind CSS | Screens, navigation, forms, API requests, session state, pagination UI |
| Backend | Node.js, Express 4 | HTTP routes, middleware, authentication, validation, controllers, services |
| Persistence | MongoDB through Mongoose 8 | User and academic documents, indexes, filtering, sorting, aggregation |
| Authentication | `jsonwebtoken`, `bcryptjs` | Signed bearer tokens, password hashing and comparison |
| Security/operations libraries | Helmet, CORS, Morgan, `express-rate-limit` | HTTP headers, cross-origin policy, request logs, process-local request limits |
| Notifications | `web-push` | Push-subscription delivery where VAPID configuration is available |
| Tests | Node's built-in `node:test` | Security/configuration, pagination helper, and opt-in API integration suites |

Source evidence includes `frontend/package.json`, `backend/package.json`, `frontend/src/App.jsx`, `frontend/src/services/api.js`, `backend/src/app.js`, `backend/server.js`, `backend/src/config/db.js`, and `backend/src/routes/`.

The frontend calls the API under `/api`; the development fallback is `http://localhost:5000/api`, and deployments can set `VITE_API_URL`. Production CORS expects the exact configured frontend origin in `CLIENT_URL`. The backend startup checks required JWT configuration and production configuration before it listens. Database connection must succeed first. Test mode does not load the ordinary backend `.env`, requires the separate `TEST_MONGODB_URI` and run ID, and disables the reminder scheduler.

## Main modules and data flow

1. A user registers or logs in. Password verification uses the User model's bcrypt helper. The backend issues a signed JWT containing the user identifier and token version.
2. The frontend API client sends the bearer token on protected requests. Authentication middleware verifies it, loads the user, and compares the token's version with the current stored version.
3. Route middleware protects academic endpoints. Controllers validate allowed fields and query or mutate records with the authenticated user's ID in the database filter.
4. Mongoose models validate and store records. Subject creation also creates an attendance record. Subject deletion removes that user's related attendance and timetable records and clears matching task subject references.
5. List controllers parse bounded pagination, execute a user-scoped Mongo query with a stable sort, skip, and limit, and return pagination metadata. The React pages retain search/filter state while loading pages and after successful deletions.
6. The dashboard combines today's classes, pending tasks, upcoming events, and attendance summaries. Notification settings can store a validated browser subscription. A scheduler scans for reminder candidates in normal server mode.

The API modules found in `backend/src/routes/` and corresponding screens include:

- **Dashboard** — student summary (`/dashboard`).
- **Subjects** — subject records and associated attendance (`/subjects`).
- **Tasks** — task lifecycle and completion toggle (`/tasks`).
- **Events** — dated campus/personal events (`/events`).
- **Attendance** — log, undo, reset, and manually adjust class counts (`/attendance`).
- **Timetable** — weekday class entries (`/timetable`).
- **Settings and profile** — notification preferences, push subscription, theme and account/password settings (`/settings`, `/profile`).

## Confirmed data structures

| Category | Evidence and classification | Use and trade-off |
|---|---|---|
| JavaScript arrays — **linear, directly used** | Controllers such as `subjectController.js` map query results; React pages map records into rows/cards. | Ordered batches and rendering. Index access is O(1); scanning/mapping n items is O(n). Arrays are simple and serialize naturally, but inserting/removing from the middle generally shifts O(n) elements. |
| JavaScript objects — **directly used** | Request/response payloads, filters, model documents, and `attendanceMap` in `subjectController.js`. | Named fields make records and lookup tables easy to use. Property lookup is typically expected O(1) in JS engines, not a strict language guarantee. An object keyed by subject ID avoids repeated attendance scans when enriching a page. |
| `Map` — **directly used** | `reminderService.js` builds `prefsByUser` from preferences. | Maps user IDs to preference documents in expected O(1) lookup after O(p) construction. This keeps reminder preference lookup from repeatedly scanning the preference list. It is temporary process memory. |
| `Set` — **directly used** | `app.js` stores allowed CORS origins; `validators/index.js` de-duplicates validation errors; `config/env.js`/`config/db.js` use allowed-value sets. | Membership checks are expected O(1), with O(k) storage for k members. These are small configuration/value sets, not a general-purpose data store. |
| Strings, regular expressions, and scalar values — **directly used** | Validators, route/query parsing, dates, and pagination helpers. | Used for input parsing and constraints. A regex scan is generally O(n) in input length for the patterns used; inputs are bounded in several validators. Dates and numeric fields represent schedule and attendance facts. |
| MongoDB documents and collections — **database-managed** | Mongoose models under `backend/src/models/` for User, Subject, Task, Event, Attendance, Timetable, NotificationPreference, and NotificationDelivery. | Persistent records and ownership relations by ObjectId. MongoDB controls internal storage/index structures; the application does not implement those internals. The database's exact physical data structure is not established by this source review. |
| MongoDB indexes — **database-managed and declared in source** | Model declarations include unique/compound indexes, e.g. account email, `(user, code)` for subjects, `(user, subject)` for attendance, and a unique reminder delivery identity. | Enforce selected uniqueness rules and can accelerate matching/sorting when the query and index order align. Indexes cost disk and write/update work. Deployment must ensure indexes are created and review actual query plans at realistic scale. |
| Query result batches and pagination metadata — **directly used** | List controller results and `createPaginationMeta` in `utils/sanitize.js`. | Keeps a request's list response bounded to at most 100 records. Count metadata may require a separate database count. A page is not an in-memory linked list. |
| Timer and scheduler state — **runtime-managed** | `reminderService.js` keeps an interval handle and an `activeRun` promise. | Prevents overlapping scans within one Node process and supports stopping the interval. It is not a durable/distributed job queue; restarts and multiple instances require operational consideration. |
| Queue, stack, linked list, heap, tree, and graph — **not found as application implementations** | Source search found no custom node-based linked list, stack/queue API, heap, tree, graph structure, or traversal algorithm. | Do not present these as SAP-SMS features. MongoDB's internal indexes are not evidence that the application implements a tree. References between a task, subject, attendance record, and user do not mean a graph algorithm is implemented. |

### Linear and non-linear structures at a glance

| Group | Confirmed structures |
|---|---|
| Linear structures used by application code | Arrays; strings as sequences |
| Non-linear structures directly implemented in application code | None identified |
| Database-managed structures | MongoDB documents, collections, declared indexes, query/aggregation execution |
| Runtime/library behavior | JavaScript object/Map/Set implementations, Express middleware chain, timer and promise state |
| Conceptual comparisons only | Linked list, stack, queue, heap, tree, graph |

## Confirmed algorithms and operation complexity

Complexities below describe the visible application operation under stated assumptions, not MongoDB's undocumented internal implementation. Database costs vary with indexes, collection size, selectivity, cache, and query plan.

| Operation | Actual workflow and steps | Time / space estimate and caveats |
|---|---|---|
| Pagination parameter validation | `utils/sanitize.js`: default page 1 and size 20; parse positive decimal integers; reject unsafe values, size above 100, and offsets above 10,000; calculate `skip=(page-1)*pageSize`. | O(1) work for bounded scalar strings; O(1) additional memory. This bounds but does not eliminate offset cost. |
| Filter, sort, page | Events, Tasks, Subjects, Attendance, and Timetable list controllers build a user-scoped filter, ask MongoDB to sort, skip, and limit, and separately calculate totals. | Database-side sort is commonly O(m log m) for m matching rows without a usable index, and can be closer to index traversal when a matching index is used. Offset pagination may advance through O(offset + pageSize) entries. Response memory is O(pageSize), with page size <=100. It is not a custom JavaScript sorting algorithm. |
| Timetable aggregation | `timetableController.js` matches the authenticated user and optional day; derives weekday order, sorts by weekday/time/id, applies skip/limit, joins subject fields with owner-aware `$lookup`, then projects response fields. | Database aggregation cost depends on matching rows, sort/index use, and join cardinality. Pagination occurs before the subject lookup in the inspected pipeline, limiting joined results to one page. Response memory is O(pageSize). |
| Subject attendance enrichment | Subject page is fetched; a query gets matching attendance for those subject IDs; one pass builds an object keyed by subject ID; a second pass attaches values. | O(s+a) application time and O(a) temporary map space for s page subjects and a matching attendance records. |
| Attendance metric calculation | `services/attendanceService.js` computes percentage, classes needed (ceiling formula), bunk allowance (floor formula), status, and flags from scalar counts/target. | O(1) time and O(1) extra space per subject. |
| Authentication and token version | JWT library verifies signature/expiry; middleware loads one user by ID and compares `ver` against `tokenVersion`. Password change increments the stored version and returns a token containing the new version. | JWT crypto and bcrypt costs are library-defined and intentionally non-constant small scalar operations. Database user lookup is index-backed by `_id`; request memory is O(1). Older tokens without a version are interpreted as version 0, so they remain valid only while the account's current version is 0. |
| Password hashing | User model uses bcryptjs with cost factor 10 for hashing and library comparison for login. | Intentionally computationally expensive per password; cost scales with configured bcrypt work factor. Space is implementation/library dependent. This slows guessing but must be balanced against authentication capacity. |
| Request validation and ownership | Validator functions check object/field types, allowed fields, enums, formats, and IDs; controllers include `{user: req.user._id}` in reads/updates/deletes. | Usually O(f) for f supplied fields and bounded validation strings. Ownership is enforced in the database query itself. |
| Search/filtering | UI filters and query filters select tasks/events/subjects; server controllers construct Mongo query predicates from validated values. | Client filtering is O(n) if over n loaded items. Database filtering cost depends on index/selectivity; arbitrary regex/text search should not be described as a custom search algorithm. |
| Reminder candidate selection and deduplication | `reminderService.js` loads enabled preferences, maps by user, fetches task/event candidates, checks the 24-hour and 1-hour windows, and claims a unique `NotificationDelivery` record before sending. | Rough application pass is O(P+T+E+C·W) for preferences P, loaded tasks T, events E, candidates C, and W=2 windows, excluding database and network costs. It retains fetched lists/maps/candidates in process memory. The unique database index helps prevent duplicate claims, but delivery is not a distributed queue with exactly-once guarantees. |
| Time-zone conversion | `utils/timezone.js` formats local wall time and calibrates offsets with a bounded number (up to three) of corrections. | O(1) bounded operations per conversion; runtime formatting cost is library-dependent. |
| Deletion recovery in UI | `frontend/src/utils/pagination.js` calculates the valid page after a successful deletion using current metadata; it retains the current page if still valid or returns to the last valid page/first page. Failed deletion leaves page state unchanged. | O(1) arithmetic and O(1) memory. Network reload dominates elapsed time. |

### Linked-list question: honest comparison

No linked list was found in the application source. SAP-SMS uses arrays and objects for in-memory batches and uses MongoDB queries for persistent records. Pagination sends a bounded slice to the UI; it does not traverse a custom linked list. These choices fit JSON APIs, database-backed filtering, and UI lists because records need stable serialization, sorting, filtering, and page access.

A linked list can insert or remove a node in O(1) **after the target node or insertion position is already known**, and it supports sequential traversal. Finding a value or position can still take O(n), so insertion/deletion is not universally O(1). Linked lists also have pointer/reference overhead and do not support efficient indexed access; retrieving the k-th item is O(k). Those properties make them less natural for numbered pages, random access, JSON transport, and MongoDB-backed records. This is a conceptual comparison for a CS presentation, not a claimed project feature.

## P3 pagination improvements

P3 added bounded, explicit page behavior and regression coverage. The pagination utility defaults to page 1 and page size 20, caps page size at 100 and maximum offset at 10,000, rejects malformed/fractional/negative/unsafe inputs, and returns metadata including `page`, `pageSize`, `totalItems`, `totalPages`, `maxPage`, `hasNextPage`, and `hasPreviousPage`. List queries use stable sort tie-breakers. The timetable aggregate applies the page window before subject lookup. Frontend deletion logic retains a valid current page, moves backward if the last record on the last page is deleted, returns to page one for an empty collection, preserves list context through the caller's reload, and does not alter pagination on a failed delete.

Evidence: `backend/src/utils/sanitize.js`, the five list controllers, `frontend/src/utils/pagination.js`, `frontend/src/utils/pagination.test.js`, and `backend/test/p3Pagination.integration.test.js`.

## P4 security and reliability improvements

Implemented protections verified in source and tests include:

- Bearer-token parsing, JWT verification/expiry handling, account lookup, and token-version enforcement in `backend/src/middleware/authMiddleware.js`.
- Password changes increment the token version and return a replacement token; frontend auth state accepts the replacement token.
- Validators reject unexpected or malformed fields, and resource operations are scoped by authenticated user ID. Admin checks require an explicit admin role.
- Startup requires database connection before serving requests; production config validates the frontend origin and proxy hop setting. Health reports database readiness separately from process liveness.
- Helmet, configured CORS, bounded JSON/form parsers, and layered general/auth/password-change rate limits are present. The rate-limit store is in-memory and per process; horizontally scaled deployments need a shared store for consistent limits.
- Push endpoints are checked against the same canonical validator when a subscription is created and immediately before delivery. Invalid stored endpoints are not sent to `web-push`; errors are handled without exposing endpoint values. This allowlist does **not** enforce DNS-rebinding protection. The sender does not follow redirects.
- Test mode uses only an explicit unique-run loopback Mongo URI, confirms server/database identity and emptiness before fixtures, disables reminder scheduling, and cleans only IDs created during the run. It never falls back to the ordinary database URI and never drops a database or collection.

These controls reduce risk but do not by themselves certify a production deployment. Review `docs/DEPLOYMENT.md` before configuring the actual hosting topology.

## Test methodology and actual results

Commands executed in this verification (2026-10-10):

| Command/check | Result |
|---|---|
| `npm.cmd --prefix backend run test:security` | **PASS** — 14 tests, 0 failed. Covers auth/token version, role/validation, push endpoint revalidation, proxy parsing, production config, startup failure, rate limit, and safe parser errors. |
| `npm.cmd --prefix backend run test:p3-config` | **PASS** — 4 tests, including fail-closed test DB configuration and identity/emptiness guard. |
| `npm.cmd --prefix frontend run test:pagination` | **PASS** — 6 tests, including deletion boundary and failed deletion. |
| Backend `node --check` sweep over `backend/src`, `backend/test`, and `backend/server.js` | **PASS** — all checked JavaScript parsed successfully. |
| `npm.cmd --prefix frontend run build` | **PASS** — Vite transformed 1,700 modules and emitted the production bundle. Initial sandbox attempt failed on parent-directory access; the same build succeeded with approved elevated execution. |
| `git diff --check` | **PASS** — no whitespace errors; Git emitted only line-ending conversion warnings for existing modified files. |
| P3 unique database preflight | **PASS** — local MongoDB Community Server loopback identity and an empty, fresh `sap_sms_p3_test_<run-id>` database were verified before any fixture writes. |
| `npm.cmd --prefix backend run test:p3-integration` with `P3_RUN_DB_INTEGRATION=1` | **PASS** — 1 integration test, 0 failed. Real HTTP routes covered pagination and deletion boundaries for Events, Tasks, Subjects, and Timetable; it also covered invalid auth/validation cases and password-change token replacement. All writes were limited to the just-verified unique local test DB; cleanup was constrained to run-created fixture IDs. No Atlas connection was made. |
| Vite preview `GET http://127.0.0.1:4173/` | **PASS** — HTTP 200, HTML content type, app root and built asset reference present. Preview was stopped afterward. |
| Interactive browser workflows / browser console | **NOT RUN** — no browser automation tool was available in this environment. A person should execute the recording walkthrough below in a browser. |
| Normal backend startup and live account workflows | **BLOCKED / NOT RUN** — ordinary startup can load local `.env` configuration, whose database destination was intentionally not inspected or used. No approved demo credentials/test account were provided. |
| Live push delivery and deployment smoke tests | **NOT RUN** — require configured VAPID, a browser subscription, and a deployed/approved environment. |

### Repeatable isolated P3 API test

Use PowerShell from the repository root. Each run creates a unique database name. Never reuse a populated database and never replace the URI with Atlas or the ordinary `MONGODB_URI`.

```powershell
$runId = [guid]::NewGuid().ToString('N').ToLowerInvariant()
$env:NODE_ENV = 'test'
$env:P3_TEST_RUN_ID = $runId
$env:TEST_MONGODB_URI = "mongodb://127.0.0.1:27017/sap_sms_p3_test_$runId"
npm.cmd --prefix backend run test:p3-preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; do not run integration tests.' }
$env:P3_RUN_DB_INTEGRATION = '1'
npm.cmd --prefix backend run test:p3-integration
npm.cmd --prefix frontend run test:pagination
```

The preflight is read-only. It must pass before the API suite creates fixtures. The suite leaves the run database/collections in place and removes only current-run fixture documents; use a new run ID next time. See `docs/P3-PAGINATION-REGRESSION.md` for the detailed procedure and API boundary cases.

## Local setup and testing instructions

The repository contains no root README. Use the scripts in the package manifests and deployment docs as the source of truth.

1. Install dependencies only as a separate setup action after reviewing package manifests: backend dependencies in `backend/`, frontend dependencies in `frontend/`. This report did not install packages.
2. Configure backend environment using the variable names documented by `backend/.env.example` and `docs/DEPLOYMENT.md`. Keep credentials private. Required categories include a strong JWT secret, MongoDB URI, and the exact frontend `CLIENT_URL`; set VAPID keys only when push notifications are needed. Do not copy a production URI into a test run.
3. Configure frontend `VITE_API_URL` for the API root (development fallback is localhost port 5000 `/api`).
4. Start the backend with `npm run dev` from `backend/` and frontend with `npm run dev` from `frontend/`, only after confirming the backend's selected database and origin are the intended local demo environment.
5. Run backend tests and frontend pagination/build checks using the commands in the previous section.

Because this audit did not inspect `.env` values or start the ordinary server, confirm the active database URI privately before using `npm run dev`. For a recording, use a dedicated demo account and data, not a real student's account.

## Demo readiness and unresolved blockers

| Area | Status | Evidence / next step |
|---|---|---|
| Production frontend build | Ready | Build passed; preview shell returned HTTP 200. |
| Backend security/config checks | Ready at code/test level | 18 Node tests across security and P3 config passed. |
| Pagination/deletion API behavior | Ready at integration-test level | Fresh unique local test database preflight and real HTTP integration suite passed. |
| Main screen/user workflow recording | Manual verification pending | No browser automation was available and no approved demo account was supplied. Confirm a safe local backend URI, run both services, then follow the script. |
| Password-change replacement token | API integration covered | For demo, perform only on the disposable demo account and verify it remains authenticated; do not display token. |
| Push delivery | Optional / not live-verified | Requires configured VAPID and browser support; test notification success means push service accepted delivery, not that the browser displayed it. |
| Deployment | Pending | No deployment was performed. Complete the checklist below and smoke-test the deployed origin/API. |
| Rate limiting at multiple instances | Operational limitation | Current limiter is in-memory/per-process; a shared store is needed if deployment uses multiple backend instances and consistent cross-instance quotas are required. |
| SSRF/DNS rebinding | Residual limitation | Provider host allowlist and send-time validation exist, but DNS rebinding is not enforced. Do not claim otherwise. |

**Best next action for recording:** privately verify the backend demo configuration targets a disposable local database, start MongoDB/backend/frontend, and rehearse the manual tests with a dedicated account and seeded non-sensitive records. If that safe environment is not confirmed, record the frontend build and test evidence without entering credentials or mutating data.

## Frontend-first practical test plan

Use a dedicated demo account and non-sensitive records. Do not show credentials, bearer tokens, database settings, or browser storage in the recording. For any test needing destructive actions, create the record during rehearsal and remove only that demo record afterward.

| ID / objective | Preconditions and exact actions | Expected result and observable API/CS concept | Pass / fail / blocked and safe recovery |
|---|---|---|---|
| T1 — Login and protected navigation | Open `/login`; enter disposable demo credentials; select **Sign in**; open Dashboard, Subjects, Tasks, Attendance, Events, Timetable, Settings, Profile. Select **Logout** and revisit a protected route. | Dashboard loads; links navigate; logged-out access returns to login. API uses bearer-authenticated protected routes. Demonstrates authentication and route guards. | Pass if protected screens load only after login and redirect after logout. Fail if another account's data appears or a protected screen remains accessible. Block if no safe account/API. Logout and restart with demo account; do not expose token. |
| T2 — Dashboard summary | After login, open **Dashboard**. Observe today's classes, pending tasks, upcoming events, attendance summary/alerts. | Cards reflect the demo account's records; `/api/dashboard` returns a combined summary. Demonstrates aggregation of several queries and scalar metric calculation. | Pass if cards load and are consistent with source records. Fail on visible error/inconsistent values. Block if records/API unavailable. Reload dashboard; avoid changing unrelated records. |
| T3 — Subject and attendance workflow | Open **Subjects**; create one demo subject; open its attendance row/details; log **Present**, then **Undo present**; adjust target if available. | New subject appears, an attendance record is associated, percentage/needed classes update and undo reverses the log. Demonstrates document association and O(1) attendance formulas. | Pass if counters and computed values agree. Fail if a second user's data changes or values are wrong. Block if account is read-only. Use only the created demo subject. |
| T4 — Task workflow and filtering | Open **Tasks**; create a task linked to the demo subject, set a due date/priority; use available status/filter/search controls; toggle complete, then pending. | Record appears in matching filter and status updates. Demonstrates predicate filtering and database-side sorting; current page renders an array batch. | Pass if filters and toggle reflect task state. Fail if unrelated tasks mutate or a request fails unexpectedly. Block if no write-safe account. Revert status or delete only this demo task. |
| T5 — Event workflow | Open **Events**; create a dated event with a demo title/category; filter by category or month if controls are visible; edit then delete the created event. | Event appears in order/filter and can be removed. Demonstrates validated CRUD, query predicates and paginated list retrieval. | Pass if only the demo event changes. Fail if filter or deletion affects other account data. Block without disposable account. Recreate only the event for retry. |
| T6 — Timetable workflow | Open **Timetable**; add a slot on a chosen weekday linked to the demo subject; switch weekday; edit and delete that slot. | Slot is shown on the correct weekday and in start-time order. Demonstrates database sort/aggregation and bounded page results. | Pass if day/time and displayed subject are correct. Fail if slot leaks across accounts or weekday. Block if unavailable. Delete only the slot created in this test. |
| T7 — Attendance pagination and boundaries | Add enough demo subjects for two pages if the UI offers page-size control or use an isolated seeded account; open **Attendance**; move to final page; delete a demo subject only if the screen supports it via Subject deletion. | Page count and list update; deleting the final row on a later page moves to a valid page; empty lists return to page one. Associated attendance removal is account-scoped. Demonstrates offset pagination and boundary recovery. | Pass if page remains valid and filters remain selected. Fail if the page is blank while records remain or other data is deleted. Block if safe extra fixtures are unavailable. Use P3 API tests instead; no hand-created fixture is required for recording. |
| T8 — Pagination and deletion across modules | For Events, Tasks, Subjects, and Timetable, create/rehearse enough demo rows for at least two pages; select the last page and delete its only row; repeat with a failed deletion only in the test suite (do not simulate by tampering with production requests on the recording account). | Successful deletion moves to previous valid page or page one if empty; current filters remain; failed delete leaves page unchanged. Demonstrates bounded page arrays and state transition. | Pass if visible range/page state is correct. Fail if UI lands beyond available pages or failure clears current state. Block if no safe data. Use automated P3 tests for failure; preserve other demo rows. |
| T9 — Password change | Open **Profile**; on disposable account enter current password and a new temporary demo password; submit; navigate to another protected page; log out and back in with new password. Never show input values in capture. | Change succeeds, replacement token keeps the current session valid, old token is invalidated, new password logs in. Demonstrates hash verification and token-version invalidation. | Pass if authenticated session remains and new credentials work. Fail if session breaks or old token remains accepted in security tests. Block without account recovery path. Use a throwaway account and known reset procedure. |
| T10 — Notification preferences | Open **Settings**; view/adjust in-app reminder toggles; save; if supported, subscribe this browser only with consent. Test notification only when VAPID is configured. | Preference state persists; test endpoint reports an explicit status. `sent_to_push_service` does not prove browser display. Invalid stored endpoint is rejected by automated security test, not UI tampering. Demonstrates validation and external service integration. | Pass if UI message matches API status. Fail if sensitive endpoint/token appears. Block when VAPID/browser permission unavailable. Unsubscribe the demo browser if needed. |
| T11 — Logout and browser session | Use **Logout**; attempt browser back and direct `/dashboard`. | Protected UI redirects; unauthenticated API requests receive unauthorized status. Demonstrates session state and middleware. | Pass if protected content is not exposed. Fail if cached private content stays usable. Block if browser cannot be exercised. Clear only the demo browser session. |

Ordinary presentation should focus on T1–T6 and selected pagination T8. Keep security cases such as malformed JWT, cross-user IDs, invalid push endpoint, throttling, and parser errors in automated tests/developer tools; do not expose tokens or make the recording look like a live penetration test.

## 8–12 minute video speaking script

Target runtime: about **10 minutes**. Rehearse once with the demo account and records already prepared. If a workflow takes longer, use a 12–14 minute technical version rather than rushing. The script below is grounded in the UI, API, and test evidence; it does not claim browser verification has already happened.

| Time | Visible screen and actions | Suggested spoken narration | CS concept and expected result |
|---|---|---|---|
| 0:00–0:45 (45 sec) | Title slide or browser at the SAP-SMS login page. Do not show credentials. | “Hello, I’m presenting SAP-SMS, a student academic planner and student management system. Students often track classes, deadlines, events, and attendance in separate places. This project brings those workflows into one account-based application. I’ll show the working modules, explain the data structures the code actually uses, and finish with the tests and current limitations.” | Problem framing and project scope. Result: viewer knows the problem and the boundaries of the walkthrough. Transition: “I’ll start with how the application is organized.” |
| 0:45–1:35 (50 sec) | Briefly show architecture diagram prepared from source: React → Express API → MongoDB. Show package names only, not environment files. | “The frontend is React with Vite and communicates with an Express API using HTTP requests. The backend validates each request, applies authentication and ownership checks, and uses Mongoose to query MongoDB. JWT is the bearer-token format, bcryptjs handles password hashes, and web-push is optional for browser reminders. The database is not accessed directly by the browser.” | Client/server separation, HTTP API, persistence. Explain “middleware” as checks that run before route logic. Result: three layers are visible. Transition: “Now I’ll use the main student workflow.” |
| 1:35–2:25 (50 sec) | Sign in using the demo account off-camera or enter privately; show Dashboard. Point to class, task, event, attendance cards. | “After signing in, I land on a dashboard. It summarizes today's classes, upcoming work, events, and attendance. The frontend requests a dashboard response, and the backend gathers those pieces for the current account. The dashboard makes common information available in one screen.” | Aggregation: combine related query results into a summary. Expected: dashboard cards correspond to seeded demo records. Optional shorter line: “This is a single summary screen over the student's records.” Transition: “I’ll open the core records behind these cards.” |
| 2:25–3:30 (65 sec) | Open Subjects; show a subject; click to Attendance and log one present/undo action if prepared. | “Subjects connect several parts of the system. A subject can have attendance and timetable entries, and tasks can refer to it. When I record attendance, the application calculates a percentage, how many classes would be needed to reach the target, and a safe bunk count. These are scalar formulas, so the calculation itself takes constant time for each subject.” | Object IDs/associations and arithmetic complexity O(1). Expected: metric changes on the demo record, then is restored by undo. Transition: “The same account-scoped pattern appears in tasks and events.” |
| 3:30–4:35 (65 sec) | Open Tasks; point at filters/status; toggle a prepared task. Then show Events and a demo event. Avoid creating if rehearsal data is ready. | “Tasks have fields like due date, priority, and completion status. I can filter and order tasks so the relevant ones are easy to find. Events use the same idea for dates and categories. The UI renders records as arrays, while filtering and sorting for the persisted list are performed by MongoDB queries. I’m not claiming a custom search or sorting algorithm here.” | Arrays and database predicates/order. Expected: task status changes and event appears under filter. Transition: “Lists need a predictable way to move through larger result sets.” |
| 4:35–5:50 (75 sec) | Open an adequately populated paginated list. Move through page controls; show the range label and active filter. On a rehearsed disposable record, delete the sole item on the final page. | “Pagination means the server returns a bounded slice instead of the whole collection. The default is 20 records per page, the maximum page size is 100, and the offset is capped. The UI tracks the current page and uses the response metadata. When the last item on the final page is deleted, it checks whether that page still exists and moves back only if necessary. If the collection becomes empty, it returns to page one. If deletion fails, it keeps the current page.” | Offset pagination, O(page size) response memory, boundary state. Expected: final page moves to valid page and filters remain. Do not perform destructive action outside demo data. Transition: “The implementation also has automated tests for this exact boundary.” |
| 5:50–6:35 (45 sec) | Show terminal test summary or a pre-captured sanitized screenshot with test names/counts only. Do not show env variables. | “The pagination helper has database-independent tests. The backend suite also ran against a fresh, unique local test database after a read-only preflight confirmed loopback identity and emptiness. The HTTP suite covered the relevant list and delete routes. The routine test safeguards never fall back to the normal database URI and never drop collections.” | Test isolation, regression testing, fail-closed configuration. Expected: pass summaries shown without secrets or credentials. Transition: “Authentication and safety checks are another important part.” |
| 6:35–7:35 (60 sec) | Show Profile without values, then optionally Settings notification panel. Explain security tests using summary text rather than tokens. | “Protected routes require a valid bearer token. The server checks the token version against the account. A password change increments that version and returns a replacement token so the current session can continue while old tokens stop working. Input validators reject unexpected fields, and queries include the authenticated user ID. Push subscriptions are checked when stored and again just before send. The host allowlist does not provide DNS-rebinding protection, so that remains a limitation.” | Authentication, authorization, validation, least privilege, security limitation. Expected: no token or subscription URL exposed. Transition: “I’ll clarify which data structures are actually implemented.” |
| 7:35–8:40 (65 sec) | Show a simple prepared table: arrays/objects/Map/Set, MongoDB/indexes; “linked list not implemented.” | “The source directly uses arrays for query results and rendering, objects for records, a Map for reminder preferences, and Sets for allowed values. MongoDB manages stored documents, indexes, sorting, and aggregation. I did not find a custom linked list, tree, heap, or graph traversal. A linked list can remove a known node in constant time, but finding the node can still take linear time, and indexed page access is a poor fit. So I’m presenting that as a comparison, not a feature.” | Linear/non-linear distinction and honest complexity claims. Expected: viewer sees evidence-based inventory, no invented algorithms. Transition: “Finally, here is what has and has not been verified.” |
| 8:40–9:35 (55 sec) | Show a small checklist: build, tests, local API integration, browser/deployment pending. | “The backend security and configuration tests passed, as did the frontend pagination tests, backend syntax checks, production build, and isolated API integration suite. The built frontend also served its shell over local HTTP. I did not run interactive browser automation or deployment smoke tests in this environment, and push display was not verified. I’ll verify those with a safe demo account before making a deployment claim.” | Verification discipline; distinguish test evidence from inference. Expected: honest test status. Transition: “I’ll close with the project's next step.” |
| 9:35–10:00 (25 sec) | Return to Dashboard or show repository URL. | “SAP-SMS brings common student planning workflows together and applies authentication, ownership checks, validation, pagination, and regression tests. The next step is a rehearsed browser walkthrough in a confirmed local demo environment, followed by the deployment checklist. Thank you for watching; the source and project documentation are available in the repository.” | Summary and invitation. Expected: concise conclusion with no deployment claim. |

## Recording, YouTube, and LinkedIn preparation

### Recording checklist

- Use a clean browser profile and a disposable demo account with a recovery path.
- Prepare realistic but fictional, non-sensitive subjects, events, tasks, timetable entries, and attendance values.
- Confirm the browser is pointed at the intended local/demo service; privately verify the backend database target before starting it.
- Set a readable screen resolution (for example, 1920×1080 if available) and browser zoom around 100–110%; ensure labels and page metadata are legible.
- Close email, messaging, password managers, database tools, developer tools with tokens, and any tab showing `.env`, credentials, or personal data.
- Disable desktop notifications for the recording; avoid accidentally showing push payloads or real notifications.
- Rehearse the exact clicks, page boundaries, test records, and cleanup of demo-only entries. Keep a fallback screenshot or pre-recorded test summary for optional push behavior.
- Record at a calm pace, pause briefly after important visible changes, and add captions/on-screen labels for “API”, “pagination metadata”, and “attendance calculation”.
- Review the recording for private data, mistaken account names, terminal credentials, and accidental unplanned deletion before sharing.

### Suggested YouTube metadata

**Title:** `SAP-SMS: Student Academic Planner | MERN Stack Project Walkthrough`

**Description draft:** “A walkthrough of SAP-SMS, a MERN student academic planner featuring subjects, timetable, tasks, events, attendance tracking, a dashboard, bounded pagination, and account-scoped API routes. The video explains the implementation's actual data structures and test evidence. Deployment and live push delivery are not demonstrated.” Add repository and chapter links only after checking they are public and correct.

**Suggested chapters:** `00:00 Introduction`; `00:45 Architecture`; `01:35 Dashboard`; `02:25 Subjects and attendance`; `03:30 Tasks and events`; `04:35 Pagination`; `05:50 Testing`; `06:35 Authentication and notifications`; `07:35 Data structures`; `08:40 Verification and limitations`; `09:35 Conclusion`.

**Keywords:** MERN stack, React, Node.js, Express, MongoDB, Mongoose, student planner, attendance tracker, pagination, JWT authentication, data structures, academic project.

### LinkedIn launch post draft

“I built SAP-SMS, a MERN student academic planner for managing subjects, timetable entries, tasks, events, and attendance in one account-based application. I also worked on bounded pagination, deletion-boundary regression tests, authentication/token handling, and safe API validation. The project walkthrough explains the data structures that are actually used and the current testing limitations. Source: [repository link]. Demo: [video link]. Deployment is still pending.”

Do not describe deployment or live push delivery as completed until they are independently verified.

## Deployment checklist — pending, not performed

- [ ] Choose hosting and MongoDB deployment; confirm data retention, backups, access controls, and restore procedures.
- [ ] Set a strong, unique JWT secret and production-only MongoDB URI in the host's secret manager. Never commit secrets or place them in frontend build variables.
- [ ] Set exact HTTPS `CLIENT_URL`; verify production CORS permits only intended frontend origins. Set `VITE_API_URL` to the intended API root if frontend/backend are on separate origins.
- [ ] Configure `TRUST_PROXY_HOPS` to match the actual reverse-proxy chain. Ensure the application is not directly exposed with a spoofable forwarded-for header; test rate-limit client identity at the deployed edge.
- [ ] Terminate HTTPS at a trusted ingress and enforce secure transport to all public endpoints.
- [ ] Verify required database connection/startup behavior and `/api/health` database readiness before directing traffic.
- [ ] Configure process restart policy, graceful termination timeouts, logs, scheduler replica count, and alerting. The reminder scheduler is per process; avoid unintended duplicate scheduler instances.
- [ ] Review in-memory rate-limit behavior. For multiple backend instances, configure a shared rate-limit store if one consistent quota is required.
- [ ] Configure VAPID only if push is in scope; verify endpoint behavior and document DNS-rebinding limitation.
- [ ] Run deployment smoke tests: frontend load, login/logout, protected route, role/ownership boundary, create/read/update/delete using a dedicated demo account, pagination boundary, password-change replacement session, health/readiness, CORS rejection for an unapproved origin, and optional push status.
- [ ] Confirm logs and error responses do not disclose secrets, bearer tokens, password hashes, or full push endpoint payloads.
- [ ] Verify backup/restore and rollback procedures before real student data is introduced.

**Deployment status: pending.** No deployment, production database connection, Atlas operation, or production smoke test was performed for this report.
