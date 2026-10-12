# HustleHub+ Vulnerability Register (INSY7314 Part 2, Person 3: API Security)

Format follows Ezekiel's SecOps blueprint (LU6): ID and description, severity with
CVSS, affected component, remediation, reference, status. A finding is only
**Closed** once a retest has been recorded (remediation flywheel).

- Evidence screenshots: `evidence/before/S##_*.png` (before fixes), `evidence/after/` (retests).
- Raw tool output: `raw/`. Every run is logged in `TESTING_LOG.md`.
- Severity bands (CVSS v3.1): 0.1-3.9 Low, 4.0-6.9 Medium, 7.0-8.9 High, 9.0-10.0 Critical.
- Status values: Open, Candidate (found in code review, evidence still to be captured),
  Fixed (untested), **Closed (retested)**, Accepted risk.

**Baseline under test:** the Part 2 code on branch `Auth-&-security---Luis` after the
escape/price fix, with Max's booking and transaction routes merged in. Test date: 2026-10-12.
This is a pre-final baseline: the first-round scans are repeated on the final merged code.

## 1. Summary

| ID | Title | Found by | Severity | CVSS | Status |
|----|-------|----------|----------|------|--------|
| F-01 | TLS 1.2 accepts cipher suites without forward secrecy | Nmap | Low | 3.7 | **Open** (confirmed) |
| C-01 | No rate limit on `POST /api/bookings` and `POST /api/transactions` | Code review | Medium (est.) | 4.3 (est.) | Candidate |
| C-02 | List endpoints return unbounded result sets | Code review | Low (est.) | 2.7-4.3 (est.) | Candidate |
| C-03 | MongoDB Atlas network allow-list is `0.0.0.0/0` | Configuration review | Medium (est.) | to score | Candidate (evidence needed) |
| C-04 | Duplicated route-local role check in booking and transaction routes | Code review | Informational | n/a | Candidate |
| I-01 | Self-signed development certificate | Nmap | Informational | n/a | Accepted risk (dev only) |

Candidates (C-xx) are real observations in the code, but have **not** yet been exercised
or evidenced the way F-01 has. Do not present them as confirmed vulnerabilities until the
"to verify" step in each entry is done and a screenshot is filed. ZAP has not been run
yet; its findings will be added as F-02 onward. The rubric asks for at least 5
vulnerabilities, so F-01 plus the verified candidates plus ZAP findings should reach it.

Separate from the above, one **functional defect** that is not a security finding is
recorded in section 5 (FN-01).

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

## 3. Candidates to verify (code review observations)

Code references are to the tree tested on 2026-10-12 and may move after Max's final merge.

### C-01: No rate limit on booking and payment creation

- **Observation:** `middleware/rateLimiters.js` defines `bookingLimiter` (30 per 15 min) but
  nothing uses it. `routes/bookingRoutes.js` (`POST /`) and `routes/transactionRoutes.js`
  (`POST /`) have only `protect` and the route-local role check. Login and register are limited
  (see V-09); these two write endpoints are not.
- **Component:** `routes/bookingRoutes.js`, `routes/transactionRoutes.js`, `middleware/rateLimiters.js`.
- **OWASP:** A04 Insecure Design / OWASP API4:2023 Unrestricted Resource Consumption.
- **Impact:** An authenticated client could create bookings or payment attempts in bulk,
  filling the database and adding load. Double payment of one booking is already blocked by a
  unique index on `Transaction.booking`, so this is spam/resource exhaustion, not money loss.
- **Estimated severity:** Medium, 4.3, `AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L`.
- **To verify (cheap, no data created):** with a client token, send `POST /api/bookings` with an
  empty body 35 times (Postman Runner). Expect 400 every time and **no 429**. Repeat for
  `POST /api/transactions`. Screenshot the Runner summary as S18 and S19.
- **Planned fix:** `authorize(ROLES.CLIENT)` plus `bookingLimiter` on bookings, and a
  `paymentLimiter` on transactions, applied after Max's final merge. Retest: 31st request
  returns 429.
- **Status:** Candidate.

### C-02: Unbounded list queries

- **Observation:** these queries return every matching document with no `limit` or paging:
  `adminController.js:15` (`User.find()`), `bookingController.js:63` and `:81`,
  `transactionController.js:76` and `:118`. `GET /api/gigs` is the one list that is
  paginated (`gigController.js:127-131`), so the pattern already exists in the project.
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

- **Observation:** `bookingRoutes.js:15-23` and `transactionRoutes.js:14-22` each define their
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

## 5. Functional defect (not a security finding)

### FN-01: CORS preflight will block `PATCH /api/bookings/:id/status`

- `index.js:65` allows `['GET', 'POST', 'PUT', 'DELETE']`, but `bookingRoutes.js:35` is a
  `PATCH`. A browser calling it from the React client will fail the CORS preflight.
  Postman is unaffected, which is why it did not show up in testing.
- Fix: add `'PATCH'` to `methods`. Raise it before Person 4 wires the booking screens to the
  real API. Not counted toward the vulnerability total.

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

- **S11 captured** (2026-10-12): the NoSQL injection login attempt is rejected (V-15). It shows
  the control working on today's code; it is not a "before the fix" screenshot, so P-01's
  original state still rests on the commit history.
- **S12** shows the 429 but not the count of attempts before it. Acceptable; note the 10-attempt
  limit from `rateLimiters.js:17-18` (10 failed attempts per 15 minutes).
- **S10 and S14b** are recorded as made with a client token and a non-admin token as planned.
  The screenshots do not show which account the token belongs to.
- **S17** (Atlas allow-list) for C-03; **S18/S19** (35 requests, no 429) for C-01.
- **ZAP** official scan after Max's and Person 4's final merge, then Nmap and `npm audit` are
  repeated on the final code.
- Fixes for F-01, C-01, C-02, C-04 and FN-01 are applied after the final merge, each retested
  with the same command or request, and this register is updated to **Closed**.
