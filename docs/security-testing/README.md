# Security testing evidence (INSY7314 Part 2, Person 3)

| File or folder | What it holds |
|----------------|---------------|
| `VULN_REGISTER.md` | Every finding and candidate, with severity, CVSS, evidence, fix, retest and status; verified controls; previously fixed items |
| `TESTING_LOG.md` | One row per scan or test run, including what is planned but not run |
| `raw/` | Unedited tool output (Nmap, `npm audit`, curl headers) |
| `evidence/before/` | Screenshots taken before any fix, named `S##_description.png` |
| `evidence/after/` | Retest screenshots, added as fixes are applied |

## Screenshot index (round 1)

| ID | File | Shows |
|----|------|-------|
| S01 | `S01_server-running.png` | API started over HTTPS with Atlas connected |
| S02 | `S02_npm-audit-api.png` | `npm audit`, API: 0 vulnerabilities |
| S03 | `S03_npm-audit-client.png` | `npm audit`, client: 0 vulnerabilities |
| S04 | `S04_nmap-full-scan-ports-1-10000.png` | Nmap scan of ports 1-10000 (full text in `raw/nmap-1.txt`) |
| S04b | `S04b_nmap-project-ports.png` | Nmap on ports 4000 and 5173 |
| S04c | `S04c_nmap-tls-ciphers-part1.png`, `...part2.png` | Nmap TLS cipher enumeration (F-01) |
| S05 | `S05_response-headers.png` | Security response headers from `/health` |
| S06 | `S06_register-client-201.png` | Register succeeds (password redacted) |
| S07 | `S07_login-freelancer-200.png` | Login succeeds (token and password redacted) |
| S08 | `S08_auth-me-200.png` | `GET /api/auth/me` with a token |
| S09 | `S09_auth-me-no-token-401.png` | `GET /api/auth/me` without a token |
| S10 | `S10_create-gig-wrong-role-403.png` | Client cannot create a gig |
| S11 | `S11_Postman_Nosqlinjection_test.png` | NoSQL injection attempt on login is rejected (400) |
| S12 | `S12_login-rate-limit-429.png` | Login rate limit hit (password redacted) |
| S13a | `S13a_create-gig-201.png` | Gig created with price 19.99 |
| S13b | `S13b_list-gigs-200.png` | Public gig list |
| S14a | `S14a_admin-users-200.png` | Admin can list users |
| S14b | `S14b_admin-users-non-admin-403.png` | Non-admin cannot list users |

## Screenshot index (round 2, final code `9f74aca`, before fixes)

| ID | File | Shows |
|----|------|-------|
| S17 | `S17_atlas-network-access.png` | Atlas IP Access List with `0.0.0.0/0` (C-03) |
| S18 | `S18_bookings-rate-limit-429.png` | `POST /api/bookings` returns 429 (C-01 retest) |
| S19 | `S19_transactions-rate-limit-429.png` | `POST /api/transactions` returns 429 (C-01 retest) |
| S20 | `S20_npm-audit-api-full.png` | `npm audit`, API: 23 vulnerabilities, tail of output (F-02); full text in `raw/npm-audit-api-2.txt` |
| S20b | `S20b_npm-audit-client.png` | `npm audit`, client: 0 vulnerabilities |
| S21 | `S21_npm-audit-api-omit-dev.png` | `npm audit --omit=dev`, API: 0 vulnerabilities |
| S22 | `S22_cors-patch-preflight.png` | `PATCH` allowed by the CORS preflight (FN-01) |
| S23 | `S23_newman-suite-run.png` | Max's Postman suite, 104 checks: 103 passed, 1 failed (R-01 test expectation) |
| S24 | `S24_zap-alerts-unauth.png` | ZAP Automated Scan screen and Alerts tab, unauthenticated scan (report `raw/zap-1-unauth-baseline.html`) |
| S25 | `S25_zap-alerts-auth.png` | ZAP Alerts tab during the authenticated scan |
| S26 | `S26_zap-alert-detail.png` | One ZAP alert in detail (User Agent Fuzzer) |
| S27 | `S27_zap-sites-tree-active-scan.png` | ZAP Sites tree after Max's suite, and the active scan at 30% (2461 requests, many 429/403 responses) |

The authenticated ZAP report is `raw/zap-2-auth-baseline.html`; its JWT and test password were
replaced by `[REDACTED-JWT]` and `[REDACTED-PASSWORD]` before filing.

## Screenshot index (after the fixes, `evidence/after/`)

| ID | File | Shows |
|----|------|-------|
| S28 | `S28_npm-audit-api-after.png` | `npm ci` then `npm audit` in `api`: 0 vulnerabilities (F-02 closed) |
| S30 | `S30_nmap-tls-after.png` | Nmap `ssl-enum-ciphers`: TLS 1.2 only ECDHE AEAD suites, TLS 1.3 unchanged (F-01 closed); text in `raw/nmap-3-tls-after.txt` |

S29, S31 and S32 (Postman retests of C-02 and C-04, and a rerun of Max's suite) were skipped by
choice; C-02 and C-04 are recorded as "verified by script, not retested on the team machine".

Screenshots are redacted where they showed a JWT or a test password. Never commit a real token,
`.env` content, a database connection string or a private key.
