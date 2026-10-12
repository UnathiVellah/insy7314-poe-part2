// A fake version of the HustleHub+ API's gig, booking and transaction routes,
// used when VITE_USE_MOCKS=true. It answers the same requests as the real
// server and with the same status codes, messages and field names, so the
// pages behave identically either way. Like the real server, it stores text
// exactly as typed (React encodes text when it draws it).
//
// It follows the API's rules:
//   - gigs: any visitor can browse, only freelancers can create, change or
//     remove their own gigs (removing only hides a gig)
//   - bookings: a client books a gig (pending), the freelancer accepts and
//     then completes it, and the client may cancel while it is pending
//   - transactions: a client can pay (simulated) once a booking is completed,
//     and each booking can only be paid once
//
// handleMockRequest takes a plain description of the request and returns
// { status, body }. It never touches the network.

import { newObjectId, store } from './mockStore'

const OBJECT_ID = /^[a-f0-9]{24}$/i

const NO_TOKEN = 'Authentication token required'
// The gig routes use the shared role check, the booking and transaction
// routes have their own, and each words the refusal differently.
const WRONG_ROLE = 'You do not have permission to perform this action'
const ACCESS_DENIED = 'Access denied'

const send = (status, body) => ({ status, body })
const fail = (status, error) => send(status, { error })

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const isId = (value) => typeof value === 'string' && OBJECT_ID.test(value)

const formatRand = (cents) =>
  `R${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Newest first. Records made in the same millisecond keep "last made, first shown".
const newestFirst = (records) =>
  [...records].reverse().sort((a, b) => b.createdAt.localeCompare(a.createdAt))

const now = () => new Date().toISOString()

/* ---------------------------------- Gigs ---------------------------------- */

const GIG_FIELDS = ['title', 'description', 'category', 'price']
const GIG_LIMITS = { title: [5, 100], description: [20, 2000], category: [1, 50] }

// Returns the cleaned fields, or null when anything is wrong.
const cleanGigInput = (body, partial = false) => {
  if (!isObject(body)) return null

  const keys = Object.keys(body)
  if (
    keys.length === 0 ||
    keys.some((key) => !GIG_FIELDS.includes(key)) ||
    (!partial && GIG_FIELDS.some((key) => !keys.includes(key)))
  ) {
    return null
  }

  const cleaned = {}

  for (const key of keys) {
    const value = body[key]

    if (key === 'price') {
      const wholeCents = Math.round(value * 100) / 100 === value
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 1000000 || !wholeCents) {
        return null
      }
      cleaned.price = value
      continue
    }

    if (typeof value !== 'string') return null

    const text = value.trim()
    const [min, max] = GIG_LIMITS[key]
    if (text.length < min || text.length > max) return null

    cleaned[key] = text
  }

  return cleaned
}

// The public list and the single-gig view only show these fields (no isActive).
const publicGig = (gig) => ({
  _id: gig._id,
  title: gig.title,
  description: gig.description,
  category: gig.category,
  price: gig.price,
  freelancer: gig.freelancer,
  createdAt: gig.createdAt,
  updatedAt: gig.updatedAt,
})

const gigsRoute = ({ method, segments, body, user, query }) => {
  const [first] = segments

  const asFreelancer = () => {
    if (!user) return fail(401, NO_TOKEN)
    if (user.role !== 'freelancer') return fail(403, WRONG_ROLE)
    return null
  }

  if (segments.length === 0 && method === 'GET') {
    const page = Number(query.get('page') ?? 1)
    const limit = Number(query.get('limit') ?? 10)

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50 ||
      (page - 1) * limit > 100000
    ) {
      return fail(400, 'Invalid pagination parameters')
    }

    const active = newestFirst(store.gigs.filter((gig) => gig.isActive))
    const start = (page - 1) * limit

    return send(200, {
      data: active.slice(start, start + limit).map(publicGig),
      pagination: { page, limit, total: active.length, totalPages: Math.ceil(active.length / limit) },
    })
  }

  if (segments.length === 0 && method === 'POST') {
    const blocked = asFreelancer()
    if (blocked) return blocked

    const input = cleanGigInput(body)
    if (!input) return fail(400, 'Invalid gig details')

    const timestamp = now()
    const gig = {
      _id: newObjectId(),
      ...input,
      freelancer: user.id,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    store.gigs.push(gig)

    return send(201, { message: 'Gig created sucessfully', data: gig })
  }

  if (segments.length === 1 && first === 'mine' && method === 'GET') {
    const blocked = asFreelancer()
    if (blocked) return blocked

    return send(200, { data: newestFirst(store.gigs.filter((gig) => gig.freelancer === user.id)) })
  }

  if (segments.length === 1 && method === 'GET') {
    if (!isId(first)) return fail(400, 'Invalid gig ID')

    const gig = store.gigs.find((item) => item._id === first && item.isActive)
    if (!gig) return fail(404, 'Gig not found')

    return send(200, { data: publicGig(gig) })
  }

  if (segments.length === 1 && (method === 'PUT' || method === 'DELETE')) {
    const blocked = asFreelancer()
    if (blocked) return blocked

    if (!isId(first)) return fail(400, 'Invalid gig ID')

    if (method === 'PUT') {
      const input = cleanGigInput(body, true)
      if (!input) return fail(400, 'Invalid gig update')

      const gig = store.gigs.find((item) => item._id === first && item.freelancer === user.id && item.isActive)
      if (!gig) return fail(404, 'Gig not found')

      Object.assign(gig, input, { updatedAt: now() })
      return send(200, { message: 'Gig updated successfully', data: gig })
    }

    const gig = store.gigs.find((item) => item._id === first && item.freelancer === user.id && item.isActive)
    if (!gig) return fail(404, 'Gig not found')

    gig.isActive = false
    gig.updatedAt = now()
    return send(200, { message: 'Gig deleted successfully' })
  }

  return fail(404, 'Route not found')
}

/* -------------------------------- Bookings -------------------------------- */

// Who may move a booking to which status, and from which status.
const TRANSITIONS = {
  accepted: { from: 'pending', actor: 'freelancer' },
  completed: { from: 'accepted', actor: 'freelancer' },
  cancelled: { from: 'pending', actor: 'client' },
}

const bookingsRoute = ({ method, segments, body, user }) => {
  if (!user) return fail(401, NO_TOKEN)

  const onlyFor = (role) => (user.role === role ? null : fail(403, ACCESS_DENIED))
  const [first, second] = segments

  if (segments.length === 0 && method === 'POST') {
    const blocked = onlyFor('client')
    if (blocked) return blocked

    if (!isObject(body) || Object.keys(body).length !== 1 || !isId(body.gigId)) {
      return fail(400, 'A valid gigId is required')
    }

    const gig = store.gigs.find((item) => item._id === body.gigId && item.isActive)
    if (!gig) return fail(404, 'Gig not found or unavailable')
    if (gig.freelancer === user.id) return fail(403, 'Cannot book your own gig')

    const timestamp = now()
    const booking = {
      _id: newObjectId(),
      gig: gig._id,
      client: user.id,
      freelancer: gig.freelancer,
      agreedPriceCents: Math.round(gig.price * 100),
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    store.bookings.push(booking)

    return send(201, { message: 'Booking created successfully', data: booking })
  }

  if (segments.length === 1 && first === 'mine' && method === 'GET') {
    const blocked = onlyFor('client')
    if (blocked) return blocked

    return send(200, { data: newestFirst(store.bookings.filter((booking) => booking.client === user.id)) })
  }

  if (segments.length === 1 && first === 'freelancer' && method === 'GET') {
    const blocked = onlyFor('freelancer')
    if (blocked) return blocked

    return send(200, { data: newestFirst(store.bookings.filter((booking) => booking.freelancer === user.id)) })
  }

  if (segments.length === 1 && method === 'GET') {
    if (!isId(first)) return fail(400, 'Invalid booking ID')

    const booking = store.bookings.find(
      (item) => item._id === first && (item.client === user.id || item.freelancer === user.id),
    )
    if (!booking) return fail(404, 'Booking not found')

    return send(200, { data: booking })
  }

  if (segments.length === 2 && second === 'status' && method === 'PATCH') {
    if (!isId(first)) return fail(400, 'Invalid booking ID')

    if (!isObject(body) || Object.keys(body).length !== 1 || typeof body.status !== 'string') {
      return fail(400, 'Invalid status update')
    }

    const transition = TRANSITIONS[body.status]
    if (!transition) return fail(400, 'Invalid status transition')

    const booking = store.bookings.find(
      (item) => item._id === first && item[transition.actor] === user.id && item.status === transition.from,
    )
    if (!booking) return fail(404, 'Booking not found or transition not permitted')

    booking.status = body.status
    booking.updatedAt = now()

    return send(200, { message: 'Booking status updated successfully', data: booking })
  }

  return fail(404, 'Route not found')
}

/* ------------------------------ Transactions ------------------------------ */

const withFormattedAmount = (transaction) => ({
  ...transaction,
  amountFormatted: formatRand(transaction.amountCents),
})

const transactionsRoute = ({ method, segments, body, user }) => {
  if (!user) return fail(401, NO_TOKEN)

  const onlyFor = (role) => (user.role === role ? null : fail(403, ACCESS_DENIED))
  const [first] = segments

  if (segments.length === 0 && method === 'POST') {
    const blocked = onlyFor('client')
    if (blocked) return blocked

    if (!isObject(body) || Object.keys(body).length !== 1 || !isId(body.bookingId)) {
      return fail(400, 'A valid bookingId is required')
    }

    const booking = store.bookings.find(
      (item) => item._id === body.bookingId && item.client === user.id && item.status === 'completed',
    )
    if (!booking) return fail(404, 'Completed booking not found')

    if (store.transactions.some((item) => item.booking === booking._id)) {
      return fail(409, 'Booking has already been paid')
    }

    const timestamp = now()
    const transaction = {
      _id: newObjectId(),
      booking: booking._id,
      client: booking.client,
      freelancer: booking.freelancer,
      amountCents: booking.agreedPriceCents,
      status: 'succeeded',
      paymentMethod: 'simulated',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    store.transactions.push(transaction)

    return send(201, { message: 'Simulated payment successful', data: withFormattedAmount(transaction) })
  }

  if (segments.length === 1 && first === 'mine' && method === 'GET') {
    const blocked = onlyFor('client')
    if (blocked) return blocked

    const own = newestFirst(store.transactions.filter((item) => item.client === user.id))
    return send(200, { data: own.map(withFormattedAmount) })
  }

  if (segments.length === 1 && first === 'income' && method === 'GET') {
    const blocked = onlyFor('freelancer')
    if (blocked) return blocked

    const earned = newestFirst(
      store.transactions.filter((item) => item.freelancer === user.id && item.status === 'succeeded'),
    )
    const totalIncomeCents = earned.reduce((sum, item) => sum + item.amountCents, 0)

    return send(200, {
      data: {
        totalIncomeCents,
        totalIncomeFormatted: formatRand(totalIncomeCents),
        completedPayments: earned.length,
        currency: 'ZAR',
        transactions: earned.map(({ _id, booking, amountCents, status, createdAt }) => ({
          _id,
          booking,
          amountCents,
          status,
          createdAt,
        })),
      },
    })
  }

  if (segments.length === 1 && method === 'GET') {
    if (!isId(first)) return fail(400, 'Invalid transaction ID')

    const transaction = store.transactions.find(
      (item) => item._id === first && (item.client === user.id || item.freelancer === user.id),
    )
    if (!transaction) return fail(404, 'Transaction not found')

    return send(200, { data: withFormattedAmount(transaction) })
  }

  return fail(404, 'Route not found')
}

/* ------------------------------- Entry point ------------------------------- */

export const handleMockRequest = ({ method, path, body, user }) => {
  const [pathname, queryString = ''] = path.split('?')
  const [root, resource, ...segments] = pathname.split('/').filter(Boolean)

  const request = {
    method: method.toUpperCase(),
    segments,
    body,
    user: user || null,
    query: new URLSearchParams(queryString),
  }

  let result = fail(404, 'Route not found')

  if (root === 'api' && resource === 'gigs') result = gigsRoute(request)
  else if (root === 'api' && resource === 'bookings') result = bookingsRoute(request)
  else if (root === 'api' && resource === 'transactions') result = transactionsRoute(request)

  // Hand back copies so a caller can never change the stored records directly.
  return { status: result.status, body: JSON.parse(JSON.stringify(result.body)) }
}
