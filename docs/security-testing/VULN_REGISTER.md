# HustleHub+ Vulnerability Register (INSY7314 Part 2, Person 3: API Security)

Format follows Ezekiel's SecOps blueprint (LU6): ID and description, severity with
CVSS, affected component, remediation, reference, status. A finding is only
**Closed** once a retest has been recorded (remediation flywheel).

- Evidence screenshots: `evidence/before/S##_*.png` (before fixes), `evidence/after/` (retests).
- Raw tool output: `raw/`. Every run is logged in `TESTING_LOG.md`.
- Severity bands (CVSS v3.1): 0.1-3.9 Low, 4.0-6.9 Medium, 7.0-8.9 High, 9.0-10.0 Critical.
- Status values: Open, Candidate (found in code review, evidence still to be captured),
  Fixed (untested), **Closed (retested)**, Accepted risk.

**Round 1 (pre-merge) baseline:** the Part 2 code on branch `Auth-&-security---Luis` at commit
`725c5ef`, tested on 2026-10-12 (screenshots S01-S14b).

**Round 2 baseline (final):** commit `0e9d99f`, the merge of `dev` (Max's final backend and
Person 4's real-API frontend) into the security branch, plus the integration delta of
2026-10-12: CORS now allows `PATCH` (FN-01), HTML-escaping of gig text removed again (R-01),
and the login/register limiter windows restored to 15 minutes / 1 hour (R-02). Security fixes
for findings (F-01, F-02, C-02, C-04) are deliberately **not** applied yet, so the baseline scans
(ZAP, `npm audit`, Nmap) show the "before" state.

## 1. Summary

| ID | Title | Found by | Severity | CVSS | Status |
|----|-------|----------|----------|------|--------|
| F-01 | TLS 1.2 accepts cipher suites without forward secrecy | Nmap | Low | 3.7 | **Open** (confirmed) |
| F-02 | Vulnerable development dependencies (Newman toolchain): 23 advisories, none in production dependencies | npm audit | Tool: Critical; contextual: Low | per advisory | **Open** (confirm with your own screenshot) |
| C-01 | No rate limit on `POST /api/bookings` and `POST /api/transactions` | Code review | Medium (est.) | 4.3 (est.) | Fixed by Max in final merge (untested) |
| C-02 | List endpoints return unbounded result sets | Code review | Low (est.) | 2.7-4.3 (est.) | Candidate |
| C-03 | MongoDB Atlas network allow-list is `0.0.0.0/0` | Configuration review | Medium (est.) | to score | Candidate (evidence needed) |
| C-04 | Duplicated route-local role check in booking and transaction routes | Code review | Informational | n/a | Candidate |
| I-01 | Self-signed development certificate | Nmap | Informational | n/a | Accepted risk (dev only) |

Candidates (C-xx) are real observations in the code, but have **not** yet been exercised
or evidenced the way F-01 has. Do not present them as confirmed vulnerabilities until the
"to verify" step in each entry is done and a screenshot is filed. ZAP has not been run
yet; its findings will be added as F-03 onward. The rubric asks for at least 5
vulnerabilities, so F-01 plus the verified candidates plus ZAP findings should reach it.

Separate from the above, a functional defect (FN-01) and two regressions introduced by the
final merge (R-01, R-02) are recorded in section 5; they are not counted as vulnerabilities.

## 2. Confirmed findings

### F-01: TLS 1.2 accepts cipher suites without forward secrecy

- **Found by:** Nmap `ssl-enum-ciphers` on 2026-10-12 18:00 SAST.
- **Description:** The HTTPS server enables only TLS 1.2 and TLS 1.3, which is good (no SSLv3,
  TLS 1.0 or TLS 1.1). However, TLS 1.2 still offers 10 of its 19 cipher suites in the form
  `TLS_RSA_WITH_*` (the other 9 are ECDHE), which use static RSA key exchange. These have no forward secrecy: if the
  server's private key is ever disclosed, traffic recorded earlier could be decrypted.
  Nmap grades all of them "A", but current guidance (Mozilla "intermediate" profile,
  OWASP Transport Layer Security cheat sheet) removes them.
- **Affected component:** `secure-mern-app/api/index.js`, `startServer()` HTTPS options.
  Only `key` and `cert` are set; no `minVersion` or `ciphers`, so Node's defaults apply.
- **OWASP Top 10 (2021):** A02 Cryptographic Failures.
- **Severity / CVSS:** Low, **3.7**, `CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N`
  (requires an attacker who already holds the key or a recorded session, hence high complexity).
- **Evidence (before):**
  `evidence/before/S04c_nmap-tls-ciphers-part1.png`, `S04c_nmap-tls-ciphers-part2.png`,
  `raw/nmap-3-tls.txt`.
- **Remediation (planned, not yet applied):** set `minVersion: 'TLSv1.2'` and an explicit
  `ciphers` list limited to ECDHE key exchange with AEAD (GCM/ChaCha20) suites in the
  `https.createServer` options. TLS 1.3 is unaffected.
- **Reference:** OWASP Transport Layer Security Cheat Sheet; Mozilla Server Side TLS guidelines.
- **Retest (planned):** repeat
  `nmap -sV --script ssl-enum-ciphers -p 4000 127.0.0.1 -oN docs/security-testing/raw/nmap-3-tls-after.txt`.
  Pass condition: no `TLS_RSA_WITH_*` suites listed; TLS 1.3 unchanged; login and
  `/health` still work over HTTPS. Screenshot to `evidence/after/`.
- **Status:** Open.

### F-02: Vulnerable development dependencies (Newman toolchain)

- **Found by:** `npm audit` on the final merged base, 2026-10-12. Reproduce on your machine
  for the evidence (S20, S21 below).
- **Description:** Max's Newman additions to `secure-mern-app/api/package.json`
  (`newman` and `newman-reporter-htmlextra`, both `devDependencies`) pull in vulnerable
  transitive packages: **23 advisories (1 critical, 15 high, 7 moderate)**. The critical and
  several high ones are in `handlebars` (JavaScript injection via AST type confusion, for example
  GHSA-2w6w-674q-4c4q), reached through `newman-reporter-htmlextra`. Others: `node-forge`
  (several signature and DoS issues), `lodash` (code injection through `_.template`),
  `@faker-js/faker`, `flatted`, `braces`, `underscore` and the `postman-*` packages.
  `npm audit --omit=dev` reports **0 vulnerabilities**, so nothing the running API ships with is
  affected; the tools run only on a developer machine against test data.
- **Affected component:** `secure-mern-app/api/package.json` (`devDependencies`) and
  `package-lock.json`.
- **OWASP Top 10 (2021):** A06 Vulnerable and Outdated Components.
- **Severity:** tool-reported **Critical** (npm audit's highest level). Contextual risk is
  **Low**: dev-only, not deployed, not reachable from the API, no untrusted input processed.
  Report both. For the CVSS number, copy the base score from the GitHub advisory page of the
  critical entry (GHSA-2w6w-674q-4c4q); I did not look up the score, so it is not stated here.
- **Evidence (before):** `evidence/before/S20_npm-audit-api-full.png` (`npm audit`),
  `evidence/before/S21_npm-audit-api-omit-dev.png` (`npm audit --omit=dev`),
  `raw/npm-audit-api-2.txt`, `raw/npm-audit-api-2-omit-dev.txt`.
- **Remediation (planned, applied after the baseline scans):** first try `overrides` in
  `package.json` that pin patched versions of the vulnerable transitive packages, keeping Newman.
  `npm audit fix --force` is not recommended: it installs `newman@4.6.1`, an older major
  version. If overrides break the Newman suite, remove the two devDependencies and run Newman on
  demand instead (`npx newman run ...`); that takes the packages out of the repo's dependency
  tree, but the risk then sits on the developer machine, which should be stated in the report.
- **Reference:** npm audit documentation; the GitHub advisories listed above.
- **Retest (planned):** `npm audit` reports 0 and Max's Newman collection still passes.
- **Status:** Open.

## 3. Candidates to verify (code review observations)

Code references are to the final merged base (commit `0e9d99f`), 2026-10-12.

### C-01: No rate limit on booking and payment creation

- **Observation (commit `725c5ef`):** `middleware/rateLimiters.js` defined `bookingLimiter` (30 per
  15 min) but nothing used it. `routes/bookingRoutes.js` (`POST /`) and `routes/transactionRoutes.js`
  (`POST /`) have only `protect` and the route-local role check. Login and register are limited
  (see V-09); these two write endpoints are not.
- **Component:** `routes/bookingRoutes.js`, `routes/transactionRoutes.js`, `middleware/rateLimiters.js`.
- **OWASP:** A04 Insecure Design / OWASP API4:2023 Unrestricted Resource Consumption.
- **Impact:** An authenticated client could create bookings or payment attempts in bulk,
  filling the database and adding load. Double payment of one booking is already blocked by a
  unique index on `Transaction.booking`, so this is spam/resource exhaustion, not money loss.
- **Estimated severity:** Medium, 4.3, `AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L`.
- **Resolution:** the final merge adds `bookingLimiter` (30 per 15 min) to `POST /api/bookings`
  and a new `paymentLimiter` (20 per 15 min) to `POST /api/transactions` (Max). The "before"
  state is the code at commit `725c5ef`
  (`git show 725c5ef:secure-mern-app/api/routes/bookingRoutes.js`); no before-screenshot exists.
- **Retest to close (S18, S19):** log in as the client. In Postman Runner send `POST /api/bookings`
  with an empty body 35 times: expect 400 for the first 30, then **429**. Then send
  `POST /api/transactions` with an empty body 25 times: expect 400 for the first 20, then **429**.
  The limiters count every request, including 400s, and key on IP address. Each route has its
  own counter, so the two tests do not affect each other; repeating one needs a fresh 15-minute
  window.
- **Status:** Fixed (untested). Becomes Closed once S18 and S19 show the 429.

### C-02: Unbounded list queries

- **Observation:** these queries return every matching document with no `limit` or paging:
  `adminController.js:15` (`User.find()`), `bookingController.js:93` and `:111`,
  `transactionController.js:97` and `:139`. `GET /api/gigs` is the one list that is
  paginated (`gigController.js:131` onward), so the pattern already exists in the project.
- **OWASP:** API4:2023 Unrestricted Resource Consumption.
- **Impact:** response size and database work grow with the data. Worst on the admin user list
  (every account, no cap). Low today because data volume is small.
- **Estimated severity:** Low. Client lists about 4.3 (`PR:L`), admin list about 2.7 (`PR:H`):
  `AV:N/AC:L/PR:?/UI:N/S:U/C:N/I:N/A:L`.
- **To verify:** code references above are the evidence (copy the lines into the report).
  Optional dynamic proof: the S14a admin response already returns all users in one body.
- **Planned fix:** reuse the paging pattern from `gigController` (default and maximum `limit`).
- **Status:** Candidate.

### C-03: Atlas network allow-list is `0.0.0.0/0`

- **Observation:** to get past `MongooseServerSelectionError` during local setup the Atlas
  Network Access list was set to `0.0.0.0/0`, meaning the database accepts connections from any
  IP. It is still protected by credentials and TLS, but the network layer is wide open.
- **OWASP:** A05 Security Misconfiguration.
- **Evidence still needed:** screenshot of Atlas, Network Access, showing the entry. File as
  `evidence/before/S17_atlas-network-access.png` (hide nothing sensitive; the page shows IP
  entries only).
- **Planned fix:** replace with the team's actual IPs (or a documented temporary entry that is
  removed before submission). Retest by screenshotting the new list and confirming the app
  still connects from an allowed IP.
- **Status:** Candidate (evidence needed). Infrastructure setting, not application code.

### C-04: Duplicated route-local role check

- **Observation:** `bookingRoutes.js:16-24` and `transactionRoutes.js:15-23` each define their
  own `requireRole` instead of the reviewed `middleware/authorize.js`. They lack the
  `!req.user` guard and return a different 403 body (`Access denied`, versus
  `You do not have permission to perform this action` from `authorize`, seen in S10 and S14b).
  The same pattern was found and fixed earlier in `gigRoutes.js` (P-03).
- **Impact:** none exploitable today, because `protect` always runs first and sets `req.user`.
  It is a maintainability and defence-in-depth issue: two implementations of one rule can drift.
- **Severity:** Informational.
- **Planned fix:** use `authorize()` in both route files (done together with C-01).
- **Status:** Candidate.

## 4. Informational and accepted

### I-01: Self-signed development certificate

- **Observation:** the API serves a self-signed certificate (`CN=localhost, O=HustleHub`,
  generated by `api/certs/generate-cert.sh`; see `raw/nmap-1.txt`, port 4000). Browsers and
  Postman need the certificate trusted or verification disabled.
- **Decision:** acceptable for local development and the demo. A production deployment must use
  a certificate from a trusted CA. The private key is excluded from version control
  (`api/.gitignore` lists `certs/*.pem`).
- **Status:** Accepted risk (development only).

### I-02: JWT kept in `sessionStorage`

- **Observation:** the client stores the token in `sessionStorage` (`client/src/services/api.js`).
  Any script that runs on the page can read it, so it relies on there being no XSS. Mitigations
  present: React encodes rendered text, gig text is stored as typed and rendered as text, and
  the token expires after 1 hour (`authController.js:147`). It is cleared when the tab closes.
- **Alternative:** an httpOnly, Secure, SameSite cookie, which scripts cannot read, at the cost
  of CSRF handling. Not a change to make at this stage.
- **Status:** Accepted risk (documented trade-off). ZAP may raise related alerts; review them then.

### I-03: Rate limits are keyed on IP address

- **Observation:** all four limiters use express-rate-limit's default key (client IP). Users
  behind one shared address (school network, NAT) share a quota, and one user can be blocked by
  another's failed logins. The API contract already notes user-ID keys as a future improvement.
- **Status:** Accepted risk (documented limitation).

## 5. Functional defects and merge regressions (not counted as vulnerabilities)

### FN-01: CORS preflight will block `PATCH /api/bookings/:id/status`

- `index.js` allowed only `GET, POST, PUT, DELETE`, but `PATCH /api/bookings/:id/status` is used
  by Person 4's accept, complete and cancel buttons (`bookingService.js`). In a browser the
  preflight fails and the call never reaches the API. Postman is unaffected, which is why it
  was not seen in testing.
- **Fixed in the integration delta:** `'PATCH'` added to `methods` in `index.js`. Verified by
  starting the real `index.js` (database stubbed) and sending a preflight from
  `http://localhost:5173`: `204` with `Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE`.
- **Retest on your machine (S22):**
  `curl.exe -k -i -X OPTIONS https://localhost:4000/api/bookings/64b000000000000000000001/status -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: PATCH"`
  and check that `PATCH` is in `Access-Control-Allow-Methods`.
- **Status:** Fixed (untested on your machine).

### R-01: HTML-escaping of gig text came back (merge regression)

- **What happened:** commit `50f67dc` ("Bug fixes, and corrections", Max) put `escapeHtml` back
  into `gigController.js` and the API contract again said "Text is HTML-escaped before
  storage". That reverses the fix committed in `5cd8785`. The client does not decode, so a gig
  titled `Tom & Jerry's` would display as `Tom &amp; Jerry&#39;s`, the double-escaping bug a
  teammate had reported.
- **Evidence:** running the earlier escape regression script against `0e9d99f` failed 2 of 6
  checks (category and title not stored as typed); after the fix all 6 pass.
- **Fixed in the integration delta:** `gigController.js` restored to the committed fix (text
  stored as typed, encoding left to React); the contract sentence corrected. XSS is still
  covered: React renders text as text, and the existing `GigCard` XSS test passes.
- **Decision to confirm with Max:** if she wants input escaping, the client would have to
  decode, which was rejected earlier because it compounds on edit and is easy to miss.
- **Status:** Fixed (verified by script).

### R-02: Login and register limiter windows differed from the documented values

- **What happened:** the final merge had `loginLimiter` at 60 minutes (comment and contract:
  15) and `registerLimiter` at 180 minutes (comment and contract: 1 hour). Stricter, but
  unannounced: a user who mistyped a password 10 times would be locked out for an hour.
- **Evidence:** the code values were `60 * 60 * 1000` (login) and `180 * 60 * 1000` (register),
  contradicting their own comments. After the fix the real `index.js` sends
  `RateLimit-Policy: 10;w=900` on login and `20;w=3600` on register.
- **Fixed in the integration delta:** windows restored to 15 minutes and 1 hour.
- **Severity:** Informational (security-configuration drift). **Status:** Fixed (verified).

## 6. Security controls verified (positive results)

These are test results with evidence, not findings. They support the secure-code-review and
analysis sections of the report.

| ID | Control | Result | Evidence |
|----|---------|--------|----------|
| V-01 | TLS versions | Only TLS 1.2 and 1.3 enabled; no SSLv3, TLS 1.0 or 1.1; all suites graded A | S04c, `raw/nmap-3-tls.txt` |
| V-02 | Network surface | Project listens on port 4000 only (5173 closed because the client was not running). Other open ports belong to the host machine and are out of scope | S04, S04b, `raw/nmap-1.txt`, `raw/nmap-2-project-ports.txt` |
| V-03 | Security headers | HSTS (1 year, subdomains), strict CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `Cache-Control: no-store`, COOP/CORP | S05, `raw/headers-1.txt` |
| V-04 | Technology disclosure | No `X-Powered-By` header | S05 |
| V-05 | CORS | `Access-Control-Allow-Origin` is the single client origin, not `*` | S05 |
| V-06 | Dependencies | `npm audit`: 0 vulnerabilities in `api` and `client` | S02, S03, `raw/npm-audit-*-1.txt` |
| V-07 | Authentication required | `GET /api/auth/me` without a token returns 401 | S09 |
| V-08 | Role-based access control | Client calling `POST /api/gigs` gets 403 (S10). Non-admin calling `GET /api/admin/users` gets 403 (S14b). Admin gets 200 (S14a) | S10, S14a, S14b |
| V-09 | Login rate limiting | Repeated failed logins end in `429 Too many requests` | S12 |
| V-10 | Secrets kept out of git | `api/.gitignore` excludes `.env` and `certs/*.pem` | `api/.gitignore` |
| V-11 | Token lifetime | JWT signed with `expiresIn` default 1h (code review, not yet tested dynamically) | `authController.js:147` |
| V-12 | No credential leakage | Login, register and `/me` responses contain no password hash | S06, S07, S08 |
| V-13 | Regression: valid price | `price: 19.99` is accepted (earlier floating-point bug fixed) | S13a |
| V-14 | Happy path still works | Register 201, login 200, `/me` 200, gig create 201, public gig list 200 | S06, S07, S08, S13a, S13b |
| V-15 | NoSQL operator injection on login | `{"email": {"$gt": ""}, "password": "x"}` is rejected with `400 All input values must be text`; no token issued. The 400 comes from the type check in `validateAuthInput.js:75`; `sanitizeInput` also strips `$`-keys earlier in the chain, so two layers cover this | S11 |
| V-16 | Booking and payment logic (final base) | Reviewed by reading: booking body must be exactly `{gigId}`; price comes from the gig in the database, never from the client; the booking and its pending transaction are created in one MongoDB transaction; status changes follow a fixed transition table with ownership in the query filter; payment needs the caller's own completed booking and flips the pending transaction with one atomic update; a second payment gives 409; unique index on `Transaction.booking`; income counts succeeded payments only | `bookingController.js`, `transactionController.js`, `models/Transaction.js` (not executed against a database in review; Max's Newman suite is the end-to-end test) |
| V-17 | Final-base checks (review sandbox) | Client: 300 tests in 24 files pass; `npm audit` 0 in `client`; API `npm audit --omit=dev` 0; all 22 API modules load; real `index.js` answers the `PATCH` preflight and the limiter windows are 900 s and 3600 s | `TESTING_LOG.md` rows 19-23 |

## 7. Previously fixed (found before this register existed)

These were fixed and committed in earlier rounds, so no "before" screenshots exist. Their
current state is confirmed in the code. Add the commit hash from GitHub Desktop (History
tab) in the last column when convenient; it is the evidence of the "before" state.

| ID | Issue | OWASP | Fix | Where | Commit |
|----|-------|-------|-----|-------|--------|
| P-01 | NoSQL operator keys (`$gt`, `$ne`, `$where`) accepted in request bodies | A03 Injection | Global `sanitizeInput` strips `$`-prefixed and dotted keys | `middleware/sanitizeInput.js`, `index.js:77`; current behaviour in S11 | |
| P-02 | Vulnerable dependency (`proxy-addr`) reported by `npm audit` | A06 Vulnerable Components | `npm audit fix`; audit now clean (S02, S03) | `api/package-lock.json` | |
| P-03 | Hand-written role check in gig routes, weaker than the shared one | A01 Broken Access Control | Replaced with `authorize(ROLES.FREELANCER)` | `routes/gigRoutes.js:22` | |
| P-04 | Contradictory password policy (middleware 8-72, controller 12-72) | A07 Identification and Authentication Failures | Single rule: 12 characters minimum, 72 bytes maximum | `middleware/validateAuthInput.js:9-10` | |

P-02 has the weakest evidence: the original audit output was not saved.

## 8. Evidence gaps and next steps

Round 2 baseline evidence to capture on the final code, **before** any security fix is applied:

- **S20, S21:** `npm audit` and `npm audit --omit=dev` in `secure-mern-app/api` (F-02); save the
  text as `raw/npm-audit-api-2.txt` and `raw/npm-audit-api-2-omit-dev.txt`. Also
  `npm audit` in `client` (expected 0) as `S20b`.
- **S22:** the `PATCH` preflight check (FN-01).
- **S18, S19:** limiter retests for C-01 (expect 429).
- **S17:** Atlas network allow-list (C-03).
- **S23:** Max's Newman/Postman collection run in Postman Runner (the `Full Backend Security
  Suite` file), as regression evidence that the merged API still behaves.
- **ZAP:** baseline automated scan, then an authenticated scan with a JWT, on the final code.
  Export the HTML report to `raw/`.
- **S12** shows the 429 but not the count of attempts before it. Acceptable; note the limit from
  `rateLimiters.js:17-18` (10 failed attempts per 15 minutes).
- **S10 and S14b** are recorded as made with a client token and a non-admin token as planned.
  The screenshots do not show which account the token belongs to.

After the baseline: apply the fixes for F-01 (TLS ciphers), F-02 (dev dependencies), C-02
(paging) and C-04 (shared `authorize()`), repeat each test, add the "after" screenshots to
`evidence/after/`, and set the entries to **Closed**.
