# HustleHub+ API Contract

**Local base URL:** `https://localhost:4000`

Requests and responses use JSON. Protected endpoints require `Authorization: Bearer <token>` using the JWT returned by `POST /api/auth/login`. Examples use illustrative MongoDB ObjectIds; replace them with actual IDs from your database.

## Roles and ownership

| Role | Access |
|---|---|
| `client` | Browse active gigs; book gigs; manage permitted booking transitions; view own bookings and transactions; simulate payment for completed own bookings |
| `freelancer` | Manage own gigs; view and update permitted bookings on their gigs; view income from succeeded payments |
| `admin` | Reserved role; admin endpoints are **not confirmed implemented** by the supplied backend code. Users cannot choose this role at registration. |

The JWT carries user identity and role (`{ id, role }`). Protected routes validate the token and enforce role and/or resource ownership. Resource-specific lookups generally return `404` when a resource does not exist **or** is not accessible to the caller; wrong-role requests return `403`. A client attempting to book their own gig receives `403`.

## Authentication

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a `client` or `freelancer` |
| POST | `/api/auth/login` | Public | Obtain a JWT |
| GET | `/api/auth/me` | Authenticated | Read current user |

**Register request:**

```json
{
  "fullName": "Thandi Nkosi",
  "email": "thandi@example.com",
  "password": "Passw0rd!123",
  "role": "freelancer"
}
```

Successful registration returns `201`; successful login returns `200` with a token and user information. The exact authentication response fields should remain consistent with the implemented auth controller.

**Login request:**

```json
{ "email": "thandi@example.com", "password": "Passw0rd!123" }
```

Send the returned token as `Authorization: Bearer <token>` on protected requests. `GET /api/auth/me` returns the authenticated user's details.

## Gigs

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/gigs` | Public | Paginated list of active gigs |
| GET | `/api/gigs/mine` | `freelancer` | Own gigs, including inactive gigs |
| GET | `/api/gigs/:id` | Public | View an active gig |
| POST | `/api/gigs` | `freelancer` | Create an owned gig |
| PUT | `/api/gigs/:id` | `freelancer`, owner | Update own gig |
| DELETE | `/api/gigs/:id` | `freelancer`, owner | Soft-delete by setting `isActive: false` |

**Example gig:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "freelancer": "507f191e810c19729de860ea",
  "title": "Logo design",
  "description": "Three concepts and one revision included",
  "category": "Design",
  "price": 500,
  "isActive": true,
  "createdAt": "2026-09-20T10:00:00.000Z",
  "updatedAt": "2026-09-20T10:00:00.000Z"
}
```

Creation requires `title`, `description`, `category`, and `price`. Updates accept supported fields. `price` is in ZAR; transaction amounts are stored separately in **integer cents**. The gig validation contract specifies title length 5–100, description length 20–2000, category length 1–50, and a positive price with no more than two decimal places. Text is stored exactly as typed (after trimming). The API does not HTML-escape input: React encodes text when it renders it, and escaping on input would show `&amp;` and `&#39;` on screen and compound on every edit. Length limits apply to the text as typed.

`GET /api/gigs?page=1&limit=10` returns:

```json
{
  "data": [],
  "pagination": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 }
}
```

Default page is 1, default limit is 10, and maximum limit is 50. Gig creation returns `201`; reads and updates return `200`; soft deletion returns `200` with a message.

## Booking and simulated-payment lifecycle

**A transaction record is created for every new booking.** The transaction begins as `pending`; no real money is transferred. A client can simulate payment only after the freelancer completes the booking. That action updates the *existing* transaction to `succeeded` rather than inserting another transaction.

| Action | Actor | Booking status | Transaction status |
|---|---|---|---|
| Create booking | Client | `pending` | `pending` (created automatically) |
| Accept booking | Assigned freelancer | `accepted` | `pending` |
| Complete booking | Assigned freelancer | `completed` | `pending` |
| Simulate payment | Booking's client | `completed` | `succeeded` |
| Cancel pending booking | Booking's client | `cancelled` | `cancelled` |

Permitted booking transitions are **`pending → accepted`** (freelancer), **`accepted → completed`** (freelancer), and **`pending → cancelled`** (client). Other transitions are rejected. The booking and its initial transaction are created in one MongoDB multi-document transaction; booking cancellation and transaction cancellation are also atomic. MongoDB deployment must support multi-document transactions.

### Booking routes

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/bookings` | `client` | Create booking plus pending transaction |
| GET | `/api/bookings/mine` | `client` | List client's bookings |
| GET | `/api/bookings/freelancer` | `freelancer` | List bookings assigned to freelancer |
| GET | `/api/bookings/:id` | Booking client or assigned freelancer | View booking |
| PATCH | `/api/bookings/:id/status` | Authorized actor for transition | Accept, complete, or cancel |

**Create booking** — `POST /api/bookings`:

```json
{ "gigId": "507f1f77bcf86cd799439011" }
```

Success: **`201 Created`**

```json
{
  "message": "Booking created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "gig": "507f1f77bcf86cd799439011",
    "client": "507f191e810c19729de860eb",
    "freelancer": "507f191e810c19729de860ea",
    "agreedPriceCents": 50000,
    "status": "pending",
    "createdAt": "2026-10-12T12:00:00.000Z",
    "updatedAt": "2026-10-12T12:00:00.000Z"
  }
}
```

The associated `pending` transaction is persisted in the database but **is not embedded in the booking response**. The client can retrieve it via `GET /api/transactions/mine`. The server calculates `agreedPriceCents` from the gig's price; clients cannot set the amount, freelancer, or booking status when creating a booking. Only active gigs can be booked, and a user cannot book their own gig.

**List bookings** — `GET /api/bookings/mine` and `GET /api/bookings/freelancer` both return `200` with `{ "data": [ ... ] }` containing booking objects. `GET /api/bookings/:id` returns `200` with `{ "data": { ... } }`. In the supplied controllers, `gig` is an ObjectId, **not a populated gig title**.

**Update booking status** — `PATCH /api/bookings/:id/status`:

```json
{ "status": "accepted" }
```

Success: `200` with `{ "message": "Booking status updated successfully", "data": { ...booking } }`. For cancellation, send `{ "status": "cancelled" }`; the linked pending transaction becomes `cancelled` atomically. Invalid transition values return `400`; unauthorized/non-applicable transitions return `404` under the current controller.

### Transaction and income routes

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/transactions` | `client` | Simulate payment for own completed booking; update pending transaction |
| GET | `/api/transactions/mine` | `client` | List own transactions of **all statuses** |
| GET | `/api/transactions/income` | `freelancer` | Income summary from succeeded transactions only |
| GET | `/api/transactions/:id` | Transaction client or freelancer | View associated transaction |

**Simulate payment** — `POST /api/transactions`:

```json
{ "bookingId": "507f1f77bcf86cd799439021" }
```

Success: **`200 OK`** (not `201`, because the transaction already exists):

```json
{
  "message": "Simulated payment successful",
  "data": {
    "_id": "507f1f77bcf86cd799439031",
    "booking": "507f1f77bcf86cd799439021",
    "client": "507f191e810c19729de860eb",
    "freelancer": "507f191e810c19729de860ea",
    "amountCents": 50000,
    "status": "succeeded",
    "paymentMethod": "simulated",
    "createdAt": "2026-10-12T12:00:00.000Z",
    "updatedAt": "2026-10-12T13:00:00.000Z",
    "amountFormatted": "R500.00"
  }
}
```

Payment requires the booking to be `completed` and owned by the authenticated client. The server verifies the linked transaction and its original amount; client-supplied amounts or extra body fields are rejected with `400`. Payment is an atomic `pending → succeeded` update. Repeated payments return `409` (`Booking has already been paid`); unavailable or inconsistent payment records return `409`. A booking that is not a completed booking belonging to the caller returns `404` (`Completed booking not found`). The unique index on `Transaction.booking` enforces **one transaction record per booking**.

**Client transaction list** — `GET /api/transactions/mine` returns `200`:

```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439031",
      "booking": "507f1f77bcf86cd799439021",
      "client": "507f191e810c19729de860eb",
      "freelancer": "507f191e810c19729de860ea",
      "amountCents": 50000,
      "status": "succeeded",
      "paymentMethod": "simulated",
      "amountFormatted": "R500.00"
    }
  ]
}
```

This list includes `pending`, `succeeded`, and `cancelled` transactions. Full records also include Mongoose timestamps. `GET /api/transactions/:id` returns a single transaction in `{ "data": { ... } }`, including `amountFormatted`.

**Freelancer income** — `GET /api/transactions/income` returns `200`:

```json
{
  "data": {
    "totalIncomeCents": 150000,
    "totalIncomeFormatted": "R1,500.00",
    "completedPayments": 3,
    "currency": "ZAR",
    "transactions": [
      {
        "_id": "507f1f77bcf86cd799439031",
        "booking": "507f1f77bcf86cd799439021",
        "amountCents": 50000,
        "status": "succeeded",
        "createdAt": "2026-10-12T12:00:00.000Z"
      }
    ]
  }
}
```

The summary and transaction list include **only `succeeded` transactions**. Pending and cancelled transactions do not contribute to income. Income records are limited to the authenticated freelancer. `totalIncomeCents` is an integer amount in cents, not rand.

## Response format

Successful responses generally use `{ "message": "...", "data": ... }`; `message` may be omitted. Paginated gig lists additionally include `pagination`.

Errors use:

```json
{ "error": "Human readable message" }
```

Do not expose stack traces, secrets, internal file paths, or configuration values in production error responses.

## Status codes

| Code | Meaning | Examples |
|---|---|---|
| `200` | Success | Login, reads, updates, simulated payment |
| `201` | Created | Register, create gig, create booking |
| `400` | Invalid request | Invalid ObjectId, unexpected fields, invalid transition |
| `401` | Unauthenticated | Missing, invalid, or expired token |
| `403` | Forbidden | Wrong role; attempting to book own gig |
| `404` | Not found or inaccessible | Missing resource, another user's resource, disallowed booking transition |
| `409` | Conflict | Duplicate email; duplicate or unavailable simulated payment |
| `429` | Rate limited | Login, registration, booking creation, simulated payment |
| `500` | Server error | Generic server failure |

## Rate limits

Implemented with `express-rate-limit` in `middleware/rateLimiters.js`. With the current default configuration, keys are based on client IP (subject to Express proxy configuration). All limiters return `429`:

```json
{ "error": "Too many requests. Please try again later." }
```

| Endpoint | Limit | Window | Notes |
|---|---|---|---|
| `POST /api/auth/login` | 10 failed requests | 15 minutes | Successful requests are excluded (`skipSuccessfulRequests`) |
| `POST /api/auth/register` | 20 requests | 1 hour | Discourages mass registrations |
| `POST /api/bookings` | 30 requests | 15 minutes | Applied after authentication and client role check |
| `POST /api/transactions` | 20 requests | 15 minutes | Applied after authentication and client role check |

The booking and payment limits above are applied in `routes/bookingRoutes.js` and `routes/transactionRoutes.js`. A future improvement is user-ID-based keys for authenticated routes, with careful IPv6/proxy handling.

## Frontend integration notes

- MongoDB documents use `_id`, not `id`; `gig`, `booking`, `client`, and `freelancer` references are ObjectId strings in the supplied controllers.
- Booking amounts use `agreedPriceCents`; transaction amounts use `amountCents`; income uses `totalIncomeCents`. Divide by 100 to display ZAR.
- The gig listing is paginated and only includes active gigs. Booking responses currently **do not populate gig title**; do not assume a `gigTitle` field exists.
- The payment endpoint returns `200`, not `201`.
- Booking creation returns a **booking**, not a `{ booking, transaction }` pair.
- The client transaction list includes pending and cancelled records, but freelancer income includes succeeded records only.
- There is no `GET /api/bookings` or `GET /api/transactions` endpoint in the supplied route files; use the role-specific routes above.
- The previously documented `/api/admin/users` route has **not been verified** in the supplied backend and should not be used by the frontend until implemented and checked.

## Testing and deployment notes

- Run Postman/Newman tests for the full booking → acceptance → completion → payment sequence, cancellation, unauthorized access, invalid IDs, tampered amounts, duplicate payments, and rate limits.
- Update existing Postman payment success assertions from `201` to `200`.
- Create **fresh test bookings** after deploying the new lifecycle: older bookings may not have a linked pending transaction. Do not silently fabricate payments for historical records.
- Ensure MongoDB supports multi-document transactions and the unique index on `Transaction.booking` is present.
- This is a **simulated** payment flow. It does not charge cards, process real funds, or guarantee settlement.
