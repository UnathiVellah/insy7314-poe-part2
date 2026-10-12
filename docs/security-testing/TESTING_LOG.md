# Testing log

One row per run. Never delete rows; add new ones at the bottom. Times are SAST (UTC+2).
A `≈` means the time was reconstructed from file timestamps or record IDs, not noted at the time.

**Code under test (all rows below):** branch `Auth-&-security---Luis`, after the escape/price
fix, with Max's booking and transaction routes merged in. Pre-final baseline.
**Commit hash:** add from GitHub Desktop, History tab (one hash applies to every row below).
**Machine:** Windows 11, PowerShell, Nmap 7.991, Postman desktop.
**Target:** the API on `https://localhost:4000` against the shared MongoDB Atlas database.

## Round 1: baseline, before any fixes (2026-10-12)

| # | Time | Tool | Target | Command or request | Raw output | Evidence | Phase | Result |
|---|------|------|--------|--------------------|-----------|----------|-------|--------|
| 1 | before 17:26 | npm | API | `npm start` | - | S01 | Before | Atlas connected, admin already exists, "HTTPS server running on port 4000" |
| 2 | ≈17:26 | npm audit | `secure-mern-app/api` | `npm audit` | `raw/npm-audit-api-1.txt` | S02 | Before | 0 vulnerabilities (V-06) |
| 3 | ≈17:26 | npm audit | `secure-mern-app/client` | `npm audit` | `raw/npm-audit-client-1.txt` | S03 | Before | 0 vulnerabilities (V-06) |
| 4 | 17:50 | Nmap | 127.0.0.1 | `nmap -sV -sC -p 1-10000 127.0.0.1` | `raw/nmap-1.txt` | S04 | Before | 12 open ports, mostly host software (Windows services, MySQL 8.0.16, SQL Browser, BitTorrent). Only 4000 belongs to the project (V-02, I-01). Screenshot is cut off at 4000/tcp; the full output is in the raw file |
| 5 | 17:57 | Nmap | 127.0.0.1 ports 4000, 5173 | `nmap -sV -sC -p 4000,5173 127.0.0.1` | `raw/nmap-2-project-ports.txt` | S04b | Before | 4000 open (`tcpwrapped`), 5173 closed. Windows socket error 10013 on Nmap's source port, so the service probe was incomplete; run 4 and run 6 are the authoritative results for port 4000 |
| 6 | 18:00 | Nmap | 127.0.0.1:4000 | `nmap -sV --script ssl-enum-ciphers -p 4000 127.0.0.1` | `raw/nmap-3-tls.txt` | S04c (two parts) | Before | TLS 1.2 and 1.3 only, all suites graded A. 10 of 19 TLS 1.2 suites use static RSA key exchange: **F-01** (V-01) |
| 7 | 18:05 | curl | `/health` | `curl.exe -k -i https://localhost:4000/health` | `raw/headers-1.txt` (second run 18:06) | S05 | Before | All expected security headers present, no `X-Powered-By`, single-origin CORS (V-03, V-04, V-05) |
| 8 | ≈18:15 | Postman | `POST /api/auth/register` | client account, role `client` | - | S06 | Before | 201 Created, no password hash in response (V-12, V-14) |
| 9 | ≈18:20 | Postman | `POST /api/auth/login` | freelancer account | - | S07 | Before | 200 OK, token returned (redacted in the screenshot) (V-12, V-14) |
| 10 | ≈18:25 | Postman | `GET /api/auth/me` | freelancer token | - | S08 | Before | 200 OK (V-14) |
| 11 | ≈18:25 | Postman | `GET /api/auth/me` | no token | - | S09 | Before | 401 `Authentication token required` (V-07) |
| 12 | 18:33 | Postman | `POST /api/gigs` | freelancer token, `price: 19.99` | - | S13a | Before | 201 Created; 19.99 accepted (V-13). Time from the record's `createdAt` |
| 13 | ≈18:35 | Postman | `GET /api/gigs` | public | - | S13b | Before | 200 OK, public list returned (V-14) |
| 14 | 18:35-19:05, exact time not noted | Postman | `POST /api/gigs` | client token | - | S10 | Before | 403 `You do not have permission to perform this action` (V-08) |
| 15 | same window | Postman | `GET /api/admin/users` | admin token | - | S14a | Before | 200 OK, user list (V-08) |
| 16 | same window | Postman | `GET /api/admin/users` | non-admin token | - | S14b | Before | 403 (V-08) |
| 17 | same window, last | Postman | `POST /api/auth/login` | repeated wrong passwords | - | S12 | Before | `429 Too many requests` (V-09). The limiter blocked further logins from this IP for the rest of the 15-minute window |
| 18 | ≈19:12 | Postman | `POST /api/auth/login` | body `{"email": {"$gt": ""}, "password": "x"}` | - | S11 | Before | 400 `All input values must be text`, no token (V-15, P-01 current behaviour) |

## Round 2: final merged base (review sandbox, 2026-10-12 ≈19:30-20:00)

Commit `0e9d99f` (merge of `dev` into the security branch). Rows 19-23 were run by Claude in a
review sandbox, not on your machine, so they have **no screenshots**; rows marked "reproduce"
must be repeated on your machine to create the evidence files. The baseline for those rows is
the merged code **plus the integration delta**, but before any security fix.

| # | Tool | Target | Command | Result | Evidence |
|---|------|--------|---------|--------|----------|
| 19 | npm audit | `api` | `npm audit` | 23 vulnerabilities: 1 critical, 15 high, 7 moderate, all from `newman` and `newman-reporter-htmlextra` (devDependencies): **F-02**. `npm audit --omit=dev`: 0 | reproduce: S20, S21 |
| 20 | npm audit | `client` | `npm audit` | 0 vulnerabilities | reproduce: S20b |
| 21 | Vitest | `client` | `npm test` | 24 files, 300 tests passed | none |
| 22 | Node scripts | `api` | escape regression (6 checks), price (12 checks), syntax check, load of all 22 modules | Before the delta: escape script failed 2 of 6 (**R-01**). After: 6/6, 12/12, all modules load | none |
| 23 | curl | real `index.js`, database stubbed | `OPTIONS` preflight for `PATCH`; `POST` to login/register to read `RateLimit-Policy` | Preflight 204 with `PATCH` allowed (**FN-01** fixed); limiter windows `w=900` and `w=3600` (**R-02** fixed) | reproduce: S22 |

## Round 2: runs on Luis's machine, final code `9f74aca`, before any security fix (2026-10-12)

| # | Time | Tool | Target | Command or request | Raw output | Evidence | Result |
|---|------|------|--------|--------------------|-----------|----------|--------|
| 24 | ≈19:55 | curl | `/api/bookings/<id>/status` | `curl.exe -k -i -X OPTIONS ... -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: PATCH"` | - | S22 | 204; `Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE` (**FN-01** fixed, retested) |
| 25 | before 20:27 | npm audit | `api` | `npm audit` | `raw/npm-audit-api-2.txt` | S20 (tail of output) | 23 vulnerabilities: 7 moderate, 15 high, 1 critical (**F-02**) |
| 26 | before 20:27 | npm audit | `api` | `npm audit --omit=dev` | `raw/npm-audit-api-2-omit-dev.txt` | S21 | 0 vulnerabilities |
| 27 | before 20:27 | npm audit | `client` | `npm audit` | - | S20b | 0 vulnerabilities |
| 28 | before 20:27 | Postman | `POST /api/bookings` | client token, empty body, repeated | - | S18 | `429 Too Many Requests` (**C-01** retest). Screenshot shows the 429 only, not the request count |
| 29 | before 20:27 | Postman | `POST /api/transactions` | client token, empty body, repeated | - | S19 | `429 Too Many Requests` (**C-01** retest). Same limitation |
| 30 | before 20:27 | Atlas web console | Network Access, IP Access List | screenshot | - | S17 | One entry, `0.0.0.0/0`, "Created as part of the Auto Setup process" (**C-03**) |

The exact times of rows 25-30 were not noted; the screenshots were sent at 20:27.

| # | Time | Tool | Target | Command or request | Raw output | Evidence | Result |
|---|------|------|--------|--------------------|-----------|----------|--------|
| 31 | 20:41 | Postman Runner | Max's `Full Backend Security Suite`, environment `HustleHub Local - Full Suite` | full run, 1 iteration | - | none (setup failure, not used) | 29 passed, 75 failed. Cause: the environment's `testPassword` was empty or under the 12-character minimum, so register and login returned 400, no token was stored and every later request got 401. Test setup error, not an API fault |
| 32 | 21:03 | Postman Runner | same collection and environment | full run after setting a 12+ character `testPassword` and fresh test emails | - | S23 | 104 checks: **103 passed, 1 failed**, 0 errors, 32 s. The one failure is "Reject XSS gig text or escape it", check "HTML is escaped": the API returns `<script>alert(1)</script>` as typed. This is the intended behaviour after **R-01** (output encoding by React, no `dangerouslySetInnerHTML` in the client); the test still expects escape-on-input. Accepted mismatch, to be agreed with Max |

| # | Time | Tool | Target | Command or request | Raw output | Evidence | Result |
|---|------|------|--------|--------------------|-----------|----------|--------|
| 33 | ≈21:24-21:32 | OWASP ZAP 2.17.0 | `https://localhost:4000` | Automated Scan, traditional spider on, ajax spider off, no authentication | `raw/zap-1-unauth-baseline.html` | S24 (screenshot still to add) | 1 alert: Informational / Low confidence, "Re-examine Cache-control Directives" on `/health`; header is `no-store`, so false positive (**I-04**). Only 3 endpoints reached, all GET. ZAP also logged 5 errors and 4 warnings (see its `zap.log`; not yet read) |

| # | Time | Tool | Target | Command or request | Raw output | Evidence | Result |
|---|------|------|--------|--------------------|-----------|----------|--------|
| 34 | ≈22:00-22:08 | Postman Runner through ZAP proxy `127.0.0.1:8080` | Max's suite, environment `HustleHub Local - Full Suite` | full run, then ZAP Replacer rule `Authorization: Bearer <client token>` | - | S27 (Sites tree) | ZAP learned 67 endpoints. A port-8080 conflict while saving ZAP's proxy options was caused by ZAP already listening there (`javaw.exe`) |
| 35 | ≈22:08-22:14 | OWASP ZAP 2.17.0 | `https://localhost:4000` | Active Scan, default context, policy `Dev Standard`, authenticated by the Replacer rule | `raw/zap-2-auth-baseline.html` (JWT and test password redacted) | S25, S26, S27 | 3 Informational alert types, no Low/Medium/High (**I-04**, **I-05**, **I-06**). 94% of responses 4xx (rate limiters answered 429; admin routes 403), only 5% 2xx. S27 shows the scan at 30% (2461 requests); completion not recorded |

Rows 36-39 were run by Claude in a review sandbox on the fix-pack code, not on your machine: they have
**no screenshots** and are not the retest evidence. The retests on your machine are listed under
"Planned".

| # | Tool | Target | Command | Result | Evidence |
|---|------|--------|---------|--------|----------|
| 36 | openssl `s_client` | real `index.js` (database stubbed), self-signed RSA cert | every TLS 1.2 suite offered by the client, tried one by one, old code vs new code | Old: 19 accepted, 10 without ECDHE. New: 3 accepted, all ECDHE with AEAD; TLS 1.3 negotiates | `raw/sandbox-tls-before-fix.txt`, `raw/sandbox-tls-after-fix.txt` |
| 37 | npm | `api` | `npm uninstall newman newman-reporter-htmlextra`; `npm audit` | 0 vulnerabilities; lock 284 -> 111 entries, no production version changed. `overrides` alone left 15 | none |
| 38 | Node script | real routers, models stubbed, 120 rows | 90 requests: paging defaults and bounds, invalid values, income totals, 401, 8 role denials | New code 90 of 90 pass; old code 16 pass, 74 fail | none |
| 39 | `node --check` | all `api` JS files | syntax check | no errors | none |

## Planned, not yet run

| What | Why | Evidence name | Notes |
|------|-----|---------------|-------|
| Second ZAP authenticated scan with limiter thresholds raised locally (not committed) | First scan was 94% 4xx, so the authenticated routes were barely tested | `raw/zap-3-auth-nolimit.html` | Restore `rateLimiters.js` afterwards; state in the report that the limiters were verified separately (S12, S18, S19) |
| `npm ci` then `npm audit` in `api` | Retest F-02 | `evidence/after/S28_npm-audit-api-after.png` | Expect 0 |
| Postman: `GET /api/bookings/mine?limit=101` (400) and without the parameter (200 with `pagination`) | Retest C-02 | `evidence/after/S29_list-pagination.png` | Client token |
| `nmap -sV --script ssl-enum-ciphers -p 4000 127.0.0.1 -oN docs/security-testing/raw/nmap-3-tls-after.txt` | Retest F-01 | `evidence/after/S30_nmap-tls-after.png`, `raw/nmap-3-tls-after.txt` | Restart the API first; expect no `TLS_RSA_WITH_*` suites |
| Postman: `GET /api/bookings/mine` with the freelancer token | Retest C-04 | `evidence/after/S31_booking-role-403.png` | Expect 403 with the new message |
| Max's suite in the Postman Runner, after the fix pack | Regression | `evidence/after/S32_newman-suite-after.png` | Expect 103 of 104 (the R-01 test) |
