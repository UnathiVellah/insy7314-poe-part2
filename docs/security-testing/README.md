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
| S11 | `S11_nosql-injection-login.png` | NoSQL injection attempt on login is rejected (400) |
| S12 | `S12_login-rate-limit-429.png` | Login rate limit hit (password redacted) |
| S13a | `S13a_create-gig-201.png` | Gig created with price 19.99 |
| S13b | `S13b_list-gigs-200.png` | Public gig list |
| S14a | `S14a_admin-users-200.png` | Admin can list users |
| S14b | `S14b_admin-users-non-admin-403.png` | Non-admin cannot list users |

Screenshots are redacted where they showed a JWT or a test password. Never commit a real token,
`.env` content, a database connection string or a private key.
