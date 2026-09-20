# HustleHub+ API Contract

Base URL (local): `https://localhost:4000`

All request and response bodies are JSON. Protected routes need the header
`Authorization: Bearer <token>`, where the token comes from `POST /api/auth/login`.

## Roles

| Role | Can do |
|---|---|
| `client` | Browse gigs, book gigs, view their own bookings and transactions |
| `freelancer` | Create, update and delete their own gigs, view bookings on their gigs, view their own income |
| `admin` | View all users, bookings and transactions. Cannot be chosen at registration. |

The role is stored in the JWT payload (`{ id, role }`) and checked on every protected request.

## Ownership rule

A user can only read, change or delete resources they own. If a resource exists
but belongs to someone else, the API answers `404 Not Found`, the same as for a
resource that does not exist. This avoids revealing which ids are real.

## Routes

`Public` means no token. `Any` means any authenticated user.

### Auth

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create an account |
| POST | `/api/auth/login` | Public | Log in and receive a JWT |
| GET | `/api/auth/me` | Any | Return the current user |

`POST /api/auth/register`

```json
{ "fullName": "Thandi Nkosi", "email": "thandi@example.com", "password": "Passw0rd!123", "role": "freelancer" }
```

`role` must be `client` or `freelancer`. Success: `201`

```json
{ "message": "User registered successfully", "data": { "id": "u1", "fullName": "Thandi Nkosi", "email": "thandi@example.com", "role": "freelancer" } }
```

`POST /api/auth/login`

```json
{ "email": "thandi@example.com", "password": "Passw0rd!123" }
```

Success: `200`

```json
{ "message": "Login successful", "data": { "token": "<jwt>", "user": { "id": "u1", "fullName": "Thandi Nkosi", "email": "thandi@example.com", "role": "freelancer" } } }
```

`GET /api/auth/me` returns `200` with `{ "data": { "id", "fullName", "email", "role" } }`.

### Gigs

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/gigs` | Any | List all gigs |
| GET | `/api/gigs/:id` | Any | View one gig |
| POST | `/api/gigs` | `freelancer` | Create a gig (owner is the caller) |
| PUT | `/api/gigs/:id` | `freelancer`, owner only | Update a gig |
| DELETE | `/api/gigs/:id` | `freelancer`, owner only | Delete a gig |

Gig shape (proposed, finalised by Person 2):

```json
{ "id": "uuid", "ownerId": "u1", "title": "Logo design", "description": "Three concepts and one revision", "price": 500, "createdAt": "2026-09-20T10:00:00.000Z" }
```

`POST` and `PUT` bodies take `title`, `description` and `price`. `price` is a positive number in ZAR.
`POST` returns `201` with `{ "data": <gig> }`. `GET`, `PUT` and `DELETE` return `200`.

### Bookings

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/bookings` | `client` | Book a gig. Creates a booking and its transaction. |
| GET | `/api/bookings` | `client`, `freelancer`, `admin` | Client: own bookings. Freelancer: bookings on their gigs. Admin: all. |

`POST /api/bookings` body: `{ "gigId": "uuid" }`. Success: `201`

```json
{ "message": "Booking confirmed", "data": { "booking": { "id": "uuid", "ownerId": "u2", "gigId": "uuid", "freelancerId": "u1", "status": "confirmed", "createdAt": "..." }, "transaction": { "id": "uuid", "ownerId": "u1", "bookingId": "uuid", "clientId": "u2", "freelancerId": "u1", "amount": 500, "status": "simulated-paid", "createdAt": "..." } } }
```

For a booking, `ownerId` is the client. For a transaction, `ownerId` is the freelancer who earned the income. Payment is simulated.

### Transactions and income

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/transactions` | `client`, `freelancer`, `admin` | Client: payments made. Freelancer: payments received. Admin: all. |
| GET | `/api/transactions/income` | `freelancer` | Income summary for the caller |

`GET /api/transactions/income` returns `200`

```json
{ "data": { "totalIncome": 1500, "transactionCount": 3, "transactions": [] } }
```

### Admin

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/admin/users` | `admin` | List all users (never includes password hashes) |

## Response format

Successful responses use `{ "message": "...", "data": ... }`. `message` is
optional. Errors always use a single field:

```json
{ "error": "Human readable message" }
```

Error messages never contain stack traces, file paths, or configuration values.

## Status codes

| Code | Meaning | Example |
|---|---|---|
| 200 | OK | Login, reads, updates, deletes |
| 201 | Created | Register, create gig, create booking |
| 400 | Validation failed | Missing field, wrong type, invalid email, `role` not `client` or `freelancer` |
| 401 | Not authenticated | Missing, invalid or expired token. Wrong login credentials. |
| 403 | Authenticated but wrong role | A client calling `POST /api/gigs` |
| 404 | Not found, or not yours | Unknown route or id, or another user's gig |
| 409 | Conflict | Email already registered |
| 429 | Too many requests | Rate limit hit on login, register or booking |
| 500 | Server error | Generic message only |

`401` versus `403`: `401` means the API does not know who you are, `403` means it
does but your role is not allowed to do that.
