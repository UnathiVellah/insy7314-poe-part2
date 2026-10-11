# API Security Review — Person 3 (Luis)

Covers Part 2's assigned scope: input validation/sanitisation on all endpoints,
rate limiting on auth and booking, and a JWT-handling review across protected
routes. This is the **second pass**, written after rebasing onto Max's latest
`dev` push, which added the gig CRUD feature (`/api/gigs/*`). It supersedes the
first review (which only covered `/api/auth/*` and `/api/admin/users`, since
gigs hadn't been pushed yet) — everything below is the current, complete
picture.

## 1. Input validation and sanitisation

**Fixed: password policy was two contradictory rules.** `middleware/validateAuthInput.js`
allowed an 8-72 character password, but `controllers/authController.js` separately
re-checked for 12-72 characters. A password of 8-11 characters passed the
middleware, reached the controller, and was rejected there with a different
error message. The middleware is now the single authoritative rule set
(12-character minimum, 72-byte maximum — bcrypt silently truncates past 72
bytes), matching the controller exactly.

**Added: NoSQL operator injection protection.** New `middleware/sanitizeInput.js`,
applied globally in `index.js` before any route — so it now also covers the
gig endpoints Max added, with no extra wiring needed. It recursively strips
any request-body key starting with `$` (e.g. `$gt`, `$ne`, `$where`) or
containing a literal `.`. I evaluated `express-mongo-sanitize` first and
rejected it: it reassigns `req.query` directly, and Express 5 (this project's
version) made `req.query` a read-only getter, so it throws a `TypeError` on
every single request. Confirmed this directly before writing the custom
version, which only mutates objects in place.

**Extended: stored-XSS protection on display fields now covers gig fields too.**
`fullName` was already HTML-escaped (`utils/sanitize.js`). This pass extends
the same treatment to `title`, `description` and `category` on
`POST /api/gigs` and `PUT /api/gigs/:id` (`controllers/gigController.js`),
since these are free-text fields other users see rendered back on gig
listings — the same reasoning as `fullName`. Deliberately **not** applied to
`price` (a number) or anything auth-related.

**Fixed: a frontend/backend contract mismatch on `category`.** Max's
`models/Gig.js` and `gigController.js` require a `category` field on gig
creation, but the pre-existing `GigForm.jsx` (built before the gig feature
landed) never collected one, and `docs/API_CONTRACT.md` didn't document it.
Any real (non-mock) gig creation through the UI would have failed with
`400 Invalid gig details` the moment someone tried it against the real API
instead of the mocks. Flagged to Max first since it touched her feature; she
confirmed the fix. Added a `category` field to `GigForm.jsx` (free-text input
with a `<datalist>` of suggestions — the API has no fixed enum, so this is
guidance, not a restriction), and updated `gigValidation.js`,
`mockApi.js`/`mockDb.js` (so the mocked dev experience matches the real API),
and all affected test files to match.

**Fixed: a duplicated, slightly weaker RBAC check in `gigRoutes.js`.** It had
its own inline `freelancerOnly` function reimplementing role-checking logic
that already exists, reviewed, in `middleware/authorize.js` — but without that
middleware's `!req.user` guard. Replaced it with `authorize(ROLES.FREELANCER)`,
the same gate `adminRoutes.js` uses, so there's one reviewed implementation of
"is this user allowed to do this" instead of two that can drift apart.

## 2. Rate limiting

`middleware/rateLimiters.js` (`express-rate-limit`):

| Limiter | Limit | Applied to |
|---|---|---|
| `loginLimiter` | 10 failed attempts / 15 min / IP | `POST /api/auth/login` |
| `registerLimiter` | 20 attempts / hour / IP | `POST /api/auth/register` |
| `bookingLimiter` | 30 attempts / 15 min / IP | Exported, ready for Person 2's `POST /api/bookings` (still not pushed) |

`loginLimiter` uses `skipSuccessfulRequests: true`. All three return the same
`{ "error": "..." }` shape as the rest of the API, not express-rate-limit's
default body. No changes this pass — gig endpoints are read/write on a
resource the caller already had to authenticate for, and don't take
unauthenticated, credential-guessable input the way login does, so they
weren't judged to need their own limiter. `bookingLimiter` is still waiting on
Person 2's booking routes.

## 3. JWT handling across protected routes

Reviewed `middleware/protect.js` and `middleware/authorize.js` again against
the new gig routes — no changes needed, the pattern holds up:

- JWT signature verified with an explicit `algorithms: ['HS256']` allowlist.
- The decoded token's `id` is validated as a real ObjectId shape before use.
- The user and role are re-fetched from the database on every request, not
  trusted from the token.
- Every failure path returns the same generic `"Invalid or expired token"`.
- `authorize(...)` returns `403` (not `401`) on a role mismatch.

`routes/gigRoutes.js` now uses `protect` + `authorize(ROLES.FREELANCER)`
consistently for create/update/delete, and leaves `GET /api/gigs` and
`GET /api/gigs/:id` public, matching `docs/API_CONTRACT.md`. Ownership itself
(can this freelancer edit/delete *this specific* gig) is enforced in the
controller via a query-filter pattern —
`Gig.findOneAndUpdate({ _id, freelancer: req.user.id })` — which returns 404
rather than 403 for a gig that exists but isn't owned by the caller. That's
deliberate and correct per the API contract's rule to avoid revealing which
IDs are real to a caller who doesn't own them.

## 4. Bugs found and fixed outside strict "security" scope

- **`mongoose` was missing from `package.json`/`package-lock.json` — again.**
  This was fixed in the first review pass, but Max's latest `dev` push was
  branched from before that fix landed, so the bug was back in the new base.
  Re-confirmed via `grep -n "mongoose" package.json` returning nothing, and
  re-applied. This one matters more now, since `models/Gig.js` also requires
  it — a clean `npm install` would crash the server on either model.
- **`GET /api/admin/users` always returned an empty list.** Re-applied for the
  same reason as above (same root cause: reading from the stale in-memory
  `stores.users` array instead of querying MongoDB). Still fixed the same way.
- **`.env.example` didn't document `MONGO_URI`.** Still fixed the same way.

## Testing note

No live MongoDB Atlas connection is available in the environment this review
was done in, so testing split into two parts:

- **Backend**: every source file (`middleware/`, `controllers/`, `routes/`,
  `models/`, `utils/`) was syntax-checked and smoke-loaded with `require()` to
  catch missing dependencies or bad imports, then the pure-logic pieces that
  don't need a live database — `sanitizeInput`, `escapeHtml`, and
  `validateRegisterInput`/`validateLoginInput` — were exercised directly
  against both legitimate and hostile inputs (NoSQL injection payloads, HTML
  in `fullName`, short/long passwords). All 9 checks passed.
- **Frontend**: the full client test suite (Vitest + React Testing Library)
  was run after the category fix — **164 tests across 22 files, all passing**,
  including the gig-form validation tests, the mock-API gig/booking tests, and
  the XSS-rendering test on `GigCard`.

`protect.js`/`authorize.js` were reviewed by reading rather than re-tested,
since they weren't modified and were already verified working in the first
pass.

**Still recommended before the demo/submission:** run the full stack once
against the real MongoDB Atlas connection (register → login → create a gig
with a category → hit the login rate limit → confirm `/api/auth/me` and
`/api/admin/users` behave as documented) to confirm nothing environment-
specific was missed, and to run through OWASP ZAP per Ezekiel's instructions
(not yet started — flagged separately).
