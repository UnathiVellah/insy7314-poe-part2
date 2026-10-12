# HustleHub+ Vulnerability Register (INSY7314 Part 2, Person 3)

Format follows Ezekiel's blueprint: ID/description, severity + CVSS, affected
component, remediation, reference, status. A finding is only "Closed" once a
retest has been recorded (remediation flywheel).

Severity bands (CVSS v3.1): 0.1-3.9 Low, 4.0-6.9 Medium, 7.0-8.9 High, 9.0-10.0 Critical.
Status values: Open -> Fix in progress -> Fixed (untested) -> **Closed (retested)** / Accepted risk.

## Summary table (update as you go)

| ID | Title | Source tool | Severity | CVSS | Status |
|----|-------|-------------|----------|------|--------|
| F-01 | | npm audit | | | Open |
| F-02 | | Nmap | | | Open |
| F-03 | | ZAP | | | Open |
| F-04 | | Code review | | | Open |
| F-05 | | Code review | | | Open |

## Finding template (copy one block per finding)

### F-XX: <short title>

- **Found by:** ZAP / Nmap / npm audit / code review / manual (Postman)
- **Date found:** YYYY-MM-DD
- **Description:** what is wrong, in one or two sentences.
- **Affected component:** file path and function, or URL + method.
- **OWASP Top 10 category:** e.g. A03 Injection, A05 Security Misconfiguration, A06 Vulnerable Components.
- **Severity / CVSS:** High, 7.5 (vector string: CVSS:3.1/AV:N/AC:L/...). Use the NVD or FIRST calculator; for npm audit/ZAP, copy the tool's own score and say so.
- **Evidence (before):** `evidence/before/F-XX_*.png` or `raw/<file>.txt` (request/response, tool output).
- **Remediation:** what was changed, and in which file/commit.
- **Reference:** OWASP cheat sheet, CVE/GHSA ID, or docs link.
- **Retest (after):** same test repeated; result; `evidence/after/F-XX_*.png`.
- **Status:** Open / Fixed (untested) / Closed (retested) / Accepted risk.

## Previously fixed (found before this register existed)

Evidence = git history (commit hash from GitHub Desktop > History). For each,
note the commit and one line of before/after. Only list genuine security issues.

| ID | Issue | Commit | Before | After |
|----|-------|--------|--------|-------|
| P-01 | NoSQL operator injection (`$`-keys in body) | | accepted by routes | stripped by `sanitizeInput` |
| P-02 | Vulnerable dependency `proxy-addr` (npm audit) | | critical advisory | 0 vulnerabilities |
| P-03 | Duplicate weaker role check in gig routes | | inline check, no `!req.user` guard | shared `authorize()` |
| P-04 | Contradictory password policy (8 vs 12 chars) | | 8-11 char passwords half-accepted | single 12-72 rule |
