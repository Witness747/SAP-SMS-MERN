# P3 Pagination Regression Procedure

This procedure is for a local or isolated non-production deployment and a disposable test account. Do not perform deletion scenarios against production or real user data.

## Isolated local test configuration

Test-mode backend startup does not load `backend/.env`. It requires `TEST_MONGODB_URI` and `P3_TEST_RUN_ID`, validates a loopback host, explicit port 27017, and database name `sap_sms_p3_test_<run-id>`, rejects URI options, and uses a direct connection. The database suffix must exactly match the 32-character lowercase hexadecimal run ID. It never falls back to `MONGODB_URI`. The reminder scheduler is disabled in test mode. Each run uses a fresh database separate from MongoDB system databases (`admin`, `config`, and `local`).

The configuration and frontend pagination tests are database-independent and do not open a MongoDB connection:

```powershell
npm.cmd --prefix backend run test:p3-config
npm.cmd --prefix frontend run test:pagination
```

### API integration suite

Before running the suite, confirm in MongoDB Compass that MongoDB Community Server is the intended local test instance and bound to loopback. Do not use Atlas. The commands below generate a new database name for each run; the suite still verifies the selected database has no collections before seeding.

Run a read-only identity and emptiness preflight first. It verifies the connected database name, loopback host and port, a single direct server, and zero collections. It writes no fixtures:

```powershell
$runId = [guid]::NewGuid().ToString('N').ToLowerInvariant()
$env:NODE_ENV = 'test'
$env:P3_TEST_RUN_ID = $runId
$env:TEST_MONGODB_URI = "mongodb://127.0.0.1:27017/sap_sms_p3_test_$runId"
npm.cmd --prefix backend run test:p3-preflight
if ($LASTEXITCODE -ne 0) { throw 'P3 database preflight failed; do not run integration tests.' }
```

Only if that command passes, run the opt-in API suite. It starts the real Express app on an ephemeral `127.0.0.1` port, exercises authenticated HTTP routes, and checks database identity and emptiness again immediately before fixture creation:

```powershell
$env:P3_RUN_DB_INTEGRATION = '1'
npm.cmd --prefix backend run test:p3-integration
npm.cmd --prefix frontend run test:pagination
```

The integration suite deletes only document IDs recorded during that run, revalidating database identity immediately before cleanup. It never drops a database or collection. Collections remain after cleanup; the next run gets a new database name. Do not remove collections through this suite.

The prior fixed-name database `sap_sms_p3_test` contains collections from an earlier attempt. The new naming scheme does not connect to or alter that database. Do not clear it as part of this procedure.

## API validation

Set `SAP_SMS_API_URL` to the API root ending in `/api` and `SAP_SMS_TOKEN` to the disposable account's bearer token. Run the following in PowerShell:

```powershell
$baseUrl = $env:SAP_SMS_API_URL.TrimEnd('/')
$headers = @{ Authorization = "Bearer $env:SAP_SMS_TOKEN" }
$routes = @('/tasks', '/events', '/attendance', '/subjects', '/timetable')

foreach ($route in $routes) {
  $default = Invoke-RestMethod -Uri "$baseUrl$route" -Headers $headers
  if ($default.meta.pagination.page -ne 1 -or $default.meta.pagination.pageSize -ne 20) {
    throw "Unexpected default pagination for $route"
  }

  $bounded = Invoke-RestMethod -Uri "$baseUrl$route`?page=1&pageSize=100" -Headers $headers
  if ($bounded.meta.pagination.pageSize -ne 100) {
    throw "Maximum page size was not accepted for $route"
  }

  $maximumOffset = Invoke-RestMethod -Uri "$baseUrl$route`?page=101&pageSize=100" -Headers $headers
  if ($maximumOffset.meta.pagination.page -ne 101 -or $maximumOffset.meta.pagination.maxPage -ne 101) {
    throw "Maximum permitted offset metadata is incorrect for $route"
  }

  foreach ($query in @(
    'page=-1',
    'page=1.5',
    'page=9007199254740992',
    'page=102&pageSize=100',
    'pageSize=101',
    'page=1&page=2'
  )) {
    try {
      Invoke-RestMethod -Uri "$baseUrl$route`?$query" -Headers $headers | Out-Null
      throw "Expected HTTP 400 for $route`?$query"
    } catch {
      if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw }
    }
  }
}
```

The default and bounded-page calls should return HTTP 200 and pagination metadata. Each invalid call should return HTTP 400 with `success: false`, message `Invalid pagination parameters`, and a non-empty `errors` array. Repeat with empty values such as `page=` and `pageSize=` if the HTTP client preserves empty query values.

## Timetable aggregation

Using the disposable account, create at least 13 timetable entries spread across multiple days and times, with valid owned subjects. Request `/api/timetable?page=1&pageSize=12` and `/api/timetable?page=2&pageSize=12`.

- Both requests should return HTTP 200 and `meta.pagination` should report the same total.
- The first page should contain 12 entries and the second should contain the remaining entry or entries.
- No `_id` should occur on both pages.
- Entries should be ordered by weekday, start time, then `_id` across the page boundary.
- A populated subject should contain only the selected subject fields; an absent subject should remain null if the fixture permits that case.

## Frontend deletion recovery

Run each case on a disposable account with the frontend pointed at the isolated API. Use at least 13 matching records to reach page 2 (the UI uses 12 records per page).

1. **Current page remains valid:** On page 2 with at least two matching rows, delete one. The remaining row should stay visible on page 2.
2. **Last row on a later page:** Arrange exactly one matching row on page 2, delete it, and verify the view moves to page 1 with the remaining rows.
3. **Only record:** With one matching record in the collection, delete it. Verify page 1 shows the empty state and no pagination controls.
4. **Filters/search preserved:** Repeat the later-page deletion with active event category/upcoming filters, task status/priority/subject/search filters, or a selected timetable day. Verify the same filter remains selected and the reloaded results still match it. Subjects have no list filters.
5. **Deletion failure:** On the isolated test account, remove a visible record through a second session before confirming its deletion in the first session. Verify the failure toast appears and the UI does not change its page. Refresh afterward to reconcile the stale row.
6. **Ordering preserved:** For tasks and timetables, verify the remaining page follows the same server ordering after deletion.

Record the environment and result for each case. These UI cases require an interactive browser and isolated application data; they are not run by the repository's current build command.
