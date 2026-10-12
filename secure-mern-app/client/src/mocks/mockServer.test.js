import { beforeEach, describe, expect, it } from 'vitest'
import {
  realBooking,
  realGigCreated,
  realGigPublic,
  realIncome,
  realPagination,
  realTransactionPaid,
} from '../test/realApiSamples'
import { handleMockRequest } from './mockServer'
import { resetMockStore } from './mockStore'

const freelancer = { id: '65f0000000000000000000b1', fullName: 'Thandi Nkosi', email: 't@example.com', role: 'freelancer' }
const otherFreelancer = { id: '65f0000000000000000000b2', fullName: 'Lerato M', email: 'l@example.com', role: 'freelancer' }
const client = { id: '65f0000000000000000000c1', fullName: 'Sipho Dlamini', email: 's@example.com', role: 'client' }
const otherClient = { id: '65f0000000000000000000c2', fullName: 'Zanele K', email: 'z@example.com', role: 'client' }

const call = (method, path, user, body) => handleMockRequest({ method, path, user, body })

const validGig = {
  title: 'Brand identity pack',
  description: 'Logo, colour palette and font pairing for a new business.',
  category: 'Design',
  price: 1200,
}

const keysOf = (object) => Object.keys(object).sort()

const createGig = (user = freelancer, overrides = {}) => call('POST', '/api/gigs', user, { ...validGig, ...overrides })

// Takes a booking all the way to "completed" so it is ready to be paid.
const completedBooking = (gigId) => {
  const booking = call('POST', '/api/bookings', client, { gigId }).body.data
  call('PATCH', `/api/bookings/${booking._id}/status`, freelancer, { status: 'accepted' })
  call('PATCH', `/api/bookings/${booking._id}/status`, freelancer, { status: 'completed' })
  return booking
}

describe('fake server', () => {
  beforeEach(() => {
    resetMockStore()
  })

  describe('gigs: browsing', () => {
    it('lists active gigs newest first, with pagination and without isActive', () => {
      const { status, body } = call('GET', '/api/gigs', null)

      expect(status).toBe(200)
      expect(body.data.length).toBeGreaterThan(0)
      expect(body.data[0]).not.toHaveProperty('isActive')
      expect(body.data.map((gig) => gig.createdAt)).toEqual(
        [...body.data.map((gig) => gig.createdAt)].sort().reverse(),
      )
      expect(body.pagination).toMatchObject({ page: 1, limit: 10, total: body.data.length })
    })

    it('pages through the results', () => {
      for (let index = 0; index < 5; index += 1) createGig(freelancer, { title: `Extra gig number ${index}` })

      const first = call('GET', '/api/gigs?page=1&limit=4', null).body
      const second = call('GET', '/api/gigs?page=2&limit=4', null).body

      expect(first.data).toHaveLength(4)
      expect(second.data).toHaveLength(4)
      expect(first.pagination).toEqual({ page: 1, limit: 4, total: 9, totalPages: 3 })
      expect(first.data[0]._id).not.toBe(second.data[0]._id)
    })

    it.each(['page=0', 'page=-1', 'limit=0', 'limit=51', 'page=abc', 'limit=2.5'])(
      'rejects the invalid pagination %s',
      (query) => {
        const { status, body } = call('GET', `/api/gigs?${query}`, null)
        expect(status).toBe(400)
        expect(body).toEqual({ error: 'Invalid pagination parameters' })
      },
    )

    it('shows one active gig to anyone, and 404s for an unknown or malformed id', () => {
      const created = createGig().body.data

      expect(call('GET', `/api/gigs/${created._id}`, null).body.data._id).toBe(created._id)
      expect(call('GET', '/api/gigs/65f00000000000000000ffff', null)).toMatchObject({ status: 404 })
      expect(call('GET', '/api/gigs/not-an-id', null)).toMatchObject({ status: 400, body: { error: 'Invalid gig ID' } })
    })
  })

  describe('gigs: creating', () => {
    it('lets a freelancer create a gig they own', () => {
      const { status, body } = createGig()

      expect(status).toBe(201)
      expect(body.data).toMatchObject({ title: 'Brand identity pack', freelancer: freelancer.id, isActive: true, price: 1200 })
    })

    it('needs a logged-in freelancer', () => {
      expect(createGig(null)).toMatchObject({ status: 401, body: { error: 'Authentication token required' } })
      expect(createGig(client)).toMatchObject({
        status: 403,
        body: { error: 'You do not have permission to perform this action' },
      })
    })

    it.each([
      ['a title under 5 characters', { title: 'Logo' }],
      ['a title over 100 characters', { title: 'a'.repeat(101) }],
      ['a description under 20 characters', { description: 'Too short' }],
      ['a description over 2000 characters', { description: 'a'.repeat(2001) }],
      ['an empty category', { category: '   ' }],
      ['a category over 50 characters', { category: 'a'.repeat(51) }],
      ['a price under R1', { price: 0.5 }],
      ['a price over R1 000 000', { price: 1000001 }],
      ['a price with three decimals', { price: 10.999 }],
      ['a price sent as text', { price: '500' }],
      ['an extra field', { isActive: false }],
    ])('rejects %s', (_description, overrides) => {
      expect(createGig(freelancer, overrides)).toMatchObject({ status: 400, body: { error: 'Invalid gig details' } })
    })

    it('rejects a gig with a missing field', () => {
      const { category, ...withoutCategory } = validGig
      expect(category).toBeDefined()
      expect(call('POST', '/api/gigs', freelancer, withoutCategory).status).toBe(400)
    })

    it('accepts ordinary prices with cents, such as R19.99, like the real API', () => {
      for (const price of [19.99, 4.35, 1.15, 9.95, 1, 1000000]) {
        expect(createGig(freelancer, { price }).status).toBe(201)
      }
    })

    it('stores text exactly as typed, with no escaping, like the real API', () => {
      const { body } = createGig(freelancer, { category: 'Writing & Translation', title: "Don't <panic> here" })

      expect(body.data.category).toBe('Writing & Translation')
      expect(body.data.title).toBe("Don't <panic> here")
    })

    it('accepts a title at the length limit even when it contains symbols', () => {
      const title = `${'A'.repeat(96)} & &`
      expect(title).toHaveLength(100)

      expect(createGig(freelancer, { title }).body.data.title).toBe(title)
    })

    it('trims the text it is given', () => {
      expect(createGig(freelancer, { title: '   Spaced out title   ' }).body.data.title).toBe('Spaced out title')
    })
  })

  describe('gigs: my gigs, editing and removing', () => {
    it('shows a freelancer their own gigs, including removed ones, and nobody else', () => {
      const mine = createGig().body.data
      createGig(otherFreelancer)
      call('DELETE', `/api/gigs/${mine._id}`, freelancer)

      const { body } = call('GET', '/api/gigs/mine', freelancer)

      expect(body.data).toHaveLength(1)
      expect(body.data[0]).toMatchObject({ _id: mine._id, isActive: false })
    })

    it('is only for freelancers', () => {
      expect(call('GET', '/api/gigs/mine', client).status).toBe(403)
      expect(call('GET', '/api/gigs/mine', null).status).toBe(401)
    })

    it('lets the owner change some or all of a gig', () => {
      const { _id } = createGig().body.data

      const partial = call('PUT', `/api/gigs/${_id}`, freelancer, { price: 1500 })
      expect(partial.status).toBe(200)
      expect(partial.body.data).toMatchObject({ price: 1500, title: 'Brand identity pack' })

      const full = call('PUT', `/api/gigs/${_id}`, freelancer, { ...validGig, title: 'A new gig title' })
      expect(full.body.data.title).toBe('A new gig title')
    })

    it('rejects an invalid update and an empty one', () => {
      const { _id } = createGig().body.data

      expect(call('PUT', `/api/gigs/${_id}`, freelancer, { price: -1 })).toMatchObject({
        status: 400,
        body: { error: 'Invalid gig update' },
      })
      expect(call('PUT', `/api/gigs/${_id}`, freelancer, {}).status).toBe(400)
    })

    it("answers 404 when someone edits or removes another freelancer's gig", () => {
      const { _id } = createGig().body.data

      expect(call('PUT', `/api/gigs/${_id}`, otherFreelancer, { price: 5 })).toMatchObject({ status: 404 })
      expect(call('DELETE', `/api/gigs/${_id}`, otherFreelancer)).toMatchObject({ status: 404 })
    })

    it('forbids a client from editing or removing gigs', () => {
      const { _id } = createGig().body.data

      expect(call('PUT', `/api/gigs/${_id}`, client, { price: 5 }).status).toBe(403)
      expect(call('DELETE', `/api/gigs/${_id}`, client).status).toBe(403)
    })

    it('removing a gig only hides it: it leaves the public list and cannot be edited or removed again', () => {
      const { _id } = createGig().body.data

      expect(call('DELETE', `/api/gigs/${_id}`, freelancer)).toMatchObject({
        status: 200,
        body: { message: 'Gig deleted successfully' },
      })

      expect(call('GET', `/api/gigs/${_id}`, null).status).toBe(404)
      expect(call('GET', '/api/gigs?limit=50', null).body.data.map((gig) => gig._id)).not.toContain(_id)
      expect(call('PUT', `/api/gigs/${_id}`, freelancer, { price: 5 }).status).toBe(404)
      expect(call('DELETE', `/api/gigs/${_id}`, freelancer).status).toBe(404)
    })
  })

  describe('bookings', () => {
    const seedGigId = '65f0000000000000000000a1'

    it('creates a pending booking that records the price in cents', () => {
      const { status, body } = call('POST', '/api/bookings', client, { gigId: seedGigId })

      expect(status).toBe(201)
      expect(body.data).toMatchObject({
        gig: seedGigId,
        client: client.id,
        agreedPriceCents: 50000,
        status: 'pending',
      })
    })

    it('keeps the agreed price even if the gig price changes later', () => {
      const gig = createGig().body.data
      const booking = call('POST', '/api/bookings', client, { gigId: gig._id }).body.data

      call('PUT', `/api/gigs/${gig._id}`, freelancer, { price: 9999 })

      const stored = call('GET', `/api/bookings/${booking._id}`, client).body.data
      expect(stored.agreedPriceCents).toBe(120000)
    })

    it('needs a logged-in client', () => {
      expect(call('POST', '/api/bookings', null, { gigId: seedGigId }).status).toBe(401)
      expect(call('POST', '/api/bookings', freelancer, { gigId: seedGigId })).toMatchObject({
        status: 403,
        body: { error: 'Access denied' },
      })
    })

    it('rejects a bad request and an unknown or removed gig', () => {
      expect(call('POST', '/api/bookings', client, {})).toMatchObject({
        status: 400,
        body: { error: 'A valid gigId is required' },
      })
      expect(call('POST', '/api/bookings', client, { gigId: 'nope' }).status).toBe(400)
      expect(call('POST', '/api/bookings', client, { gigId: seedGigId, extra: 1 }).status).toBe(400)
      expect(call('POST', '/api/bookings', client, { gigId: '65f00000000000000000ffff' })).toMatchObject({
        status: 404,
        body: { error: 'Gig not found or unavailable' },
      })

      const removed = createGig().body.data
      call('DELETE', `/api/gigs/${removed._id}`, freelancer)
      expect(call('POST', '/api/bookings', client, { gigId: removed._id }).status).toBe(404)
    })

    it("shows each person only their own bookings, newest first, in the right list", () => {
      const gig = createGig().body.data
      call('POST', '/api/bookings', client, { gigId: seedGigId })
      call('POST', '/api/bookings', client, { gigId: gig._id })
      call('POST', '/api/bookings', otherClient, { gigId: gig._id })

      expect(call('GET', '/api/bookings/mine', client).body.data).toHaveLength(2)
      expect(call('GET', '/api/bookings/mine', otherClient).body.data).toHaveLength(1)
      expect(call('GET', '/api/bookings/freelancer', freelancer).body.data).toHaveLength(2)
      expect(call('GET', '/api/bookings/freelancer', otherFreelancer).body.data).toHaveLength(0)
      expect(call('GET', '/api/bookings/mine', client).body.data[0].gig).toBe(gig._id)
    })

    it('keeps the lists for the right role only, and has no list of all bookings', () => {
      expect(call('GET', '/api/bookings/mine', freelancer).status).toBe(403)
      expect(call('GET', '/api/bookings/freelancer', client).status).toBe(403)
      expect(call('GET', '/api/bookings', client)).toMatchObject({ status: 404, body: { error: 'Route not found' } })
      expect(call('GET', '/api/bookings/mine', null).status).toBe(401)
    })

    it('shows a booking only to the two people involved', () => {
      const { _id } = call('POST', '/api/bookings', client, { gigId: seedGigId }).body.data

      expect(call('GET', `/api/bookings/${_id}`, client).status).toBe(200)
      expect(call('GET', `/api/bookings/${_id}`, otherClient)).toMatchObject({ status: 404, body: { error: 'Booking not found' } })
      expect(call('GET', '/api/bookings/not-an-id', client).status).toBe(400)
    })
  })

  describe('booking status changes', () => {
    const setup = () => {
      const gig = createGig().body.data
      return call('POST', '/api/bookings', client, { gigId: gig._id }).body.data
    }
    const change = (booking, user, status) => call('PATCH', `/api/bookings/${booking._id}/status`, user, { status })

    it('lets the freelancer accept, then complete', () => {
      const booking = setup()

      expect(change(booking, freelancer, 'accepted').body.data.status).toBe('accepted')
      expect(change(booking, freelancer, 'completed').body.data.status).toBe('completed')
    })

    it('lets the client cancel while the booking is still pending', () => {
      const booking = setup()
      expect(change(booking, client, 'cancelled').body.data.status).toBe('cancelled')
    })

    it.each([
      ['complete a booking that was never accepted', 'freelancer', 'completed'],
      ['cancel as the freelancer', 'freelancer', 'cancelled'],
      ['accept as the client', 'client', 'accepted'],
      ['complete as the client', 'client', 'completed'],
    ])('refuses to %s', (_description, role, status) => {
      const booking = setup()
      const user = role === 'client' ? client : freelancer

      expect(change(booking, user, status)).toMatchObject({
        status: 404,
        body: { error: 'Booking not found or transition not permitted' },
      })
    })

    it('refuses to cancel once the booking has been accepted, and to accept twice', () => {
      const booking = setup()
      change(booking, freelancer, 'accepted')

      expect(change(booking, client, 'cancelled').status).toBe(404)
      expect(change(booking, freelancer, 'accepted').status).toBe(404)
    })

    it("refuses a stranger's change", () => {
      const booking = setup()

      expect(change(booking, otherFreelancer, 'accepted').status).toBe(404)
      expect(change(booking, otherClient, 'cancelled').status).toBe(404)
    })

    it('rejects an unknown status and a malformed request', () => {
      const booking = setup()

      expect(change(booking, freelancer, 'refunded')).toMatchObject({ status: 400, body: { error: 'Invalid status transition' } })
      expect(call('PATCH', `/api/bookings/${booking._id}/status`, freelancer, {})).toMatchObject({
        status: 400,
        body: { error: 'Invalid status update' },
      })
      expect(call('PATCH', '/api/bookings/not-an-id/status', freelancer, { status: 'accepted' }).status).toBe(400)
    })
  })

  describe('payments (simulated)', () => {
    const gigId = () => createGig().body.data._id

    it('lets the client pay once the booking is completed, for the agreed amount', () => {
      const booking = completedBooking(gigId())

      const { status, body } = call('POST', '/api/transactions', client, { bookingId: booking._id })

      expect(status).toBe(201)
      expect(body.data).toMatchObject({
        booking: booking._id,
        client: client.id,
        freelancer: freelancer.id,
        amountCents: 120000,
        status: 'succeeded',
        paymentMethod: 'simulated',
      })
    })

    it('refuses payment until the booking is completed', () => {
      const booking = call('POST', '/api/bookings', client, { gigId: gigId() }).body.data

      expect(call('POST', '/api/transactions', client, { bookingId: booking._id })).toMatchObject({
        status: 404,
        body: { error: 'Completed booking not found' },
      })

      call('PATCH', `/api/bookings/${booking._id}/status`, freelancer, { status: 'accepted' })
      expect(call('POST', '/api/transactions', client, { bookingId: booking._id }).status).toBe(404)
    })

    it('refuses to pay twice for the same booking', () => {
      const booking = completedBooking(gigId())
      call('POST', '/api/transactions', client, { bookingId: booking._id })

      expect(call('POST', '/api/transactions', client, { bookingId: booking._id })).toMatchObject({
        status: 409,
        body: { error: 'Booking has already been paid' },
      })
    })

    it("refuses someone else's booking, a freelancer's attempt and a malformed request", () => {
      const booking = completedBooking(gigId())

      expect(call('POST', '/api/transactions', otherClient, { bookingId: booking._id }).status).toBe(404)
      expect(call('POST', '/api/transactions', freelancer, { bookingId: booking._id })).toMatchObject({
        status: 403,
        body: { error: 'Access denied' },
      })
      expect(call('POST', '/api/transactions', client, {})).toMatchObject({
        status: 400,
        body: { error: 'A valid bookingId is required' },
      })
      expect(call('POST', '/api/transactions', null, { bookingId: booking._id }).status).toBe(401)
    })

    it("lists a client's payments, newest first, with a formatted amount", () => {
      const first = completedBooking(gigId())
      const second = completedBooking(gigId())
      call('POST', '/api/transactions', client, { bookingId: first._id })
      call('POST', '/api/transactions', client, { bookingId: second._id })

      const { body } = call('GET', '/api/transactions/mine', client)

      expect(body.data).toHaveLength(2)
      expect(body.data[0].booking).toBe(second._id)
      expect(body.data[0].amountFormatted).toBe('R1,200.00')
      expect(call('GET', '/api/transactions/mine', otherClient).body.data).toEqual([])
      expect(call('GET', '/api/transactions/mine', freelancer).status).toBe(403)
    })

    it("totals a freelancer's income and lists each payment", () => {
      const first = completedBooking(gigId())
      const second = completedBooking(gigId())
      call('POST', '/api/transactions', client, { bookingId: first._id })
      call('POST', '/api/transactions', client, { bookingId: second._id })

      const { body } = call('GET', '/api/transactions/income', freelancer)

      expect(body.data).toMatchObject({
        totalIncomeCents: 240000,
        totalIncomeFormatted: 'R2,400.00',
        completedPayments: 2,
        currency: 'ZAR',
      })
      expect(body.data.transactions).toHaveLength(2)
      expect(keysOf(body.data.transactions[0])).toEqual(['_id', 'amountCents', 'booking', 'createdAt', 'status'])
    })

    it('shows zero income to a freelancer with no payments, and keeps the endpoint for freelancers only', () => {
      expect(call('GET', '/api/transactions/income', otherFreelancer).body.data).toMatchObject({
        totalIncomeCents: 0,
        completedPayments: 0,
        transactions: [],
      })
      expect(call('GET', '/api/transactions/income', client)).toMatchObject({ status: 403, body: { error: 'Access denied' } })
    })

    it('shows a payment only to the client and freelancer involved', () => {
      const booking = completedBooking(gigId())
      const transaction = call('POST', '/api/transactions', client, { bookingId: booking._id }).body.data

      expect(call('GET', `/api/transactions/${transaction._id}`, client).status).toBe(200)
      expect(call('GET', `/api/transactions/${transaction._id}`, freelancer).status).toBe(200)
      expect(call('GET', `/api/transactions/${transaction._id}`, otherClient)).toMatchObject({
        status: 404,
        body: { error: 'Transaction not found' },
      })
      expect(call('GET', '/api/transactions/not-an-id', client).status).toBe(400)
    })
  })

  describe('general behaviour', () => {
    it('answers an unknown route with 404', () => {
      expect(call('GET', '/api/unknown', client)).toMatchObject({ status: 404, body: { error: 'Route not found' } })
      expect(call('DELETE', '/api/transactions', client).status).toBe(404)
    })

    it('hands back copies, so a caller cannot change the stored data', () => {
      const { body } = call('GET', '/api/gigs', null)
      body.data[0].title = 'Hacked'

      expect(call('GET', '/api/gigs', null).body.data[0].title).not.toBe('Hacked')
    })

    it('issues ids that look like real database ids', () => {
      expect(createGig().body.data._id).toMatch(/^[a-f0-9]{24}$/)
    })
  })

  describe('matches the real API', () => {
    it('returns the same gig fields as the real API', () => {
      const created = createGig().body.data
      const mine = call('GET', '/api/gigs/mine', freelancer).body.data[0]
      const publicList = call('GET', '/api/gigs', null).body.data[0]

      expect(keysOf(created)).toEqual(keysOf(realGigCreated))
      expect(keysOf(mine)).toEqual(keysOf(realGigCreated))
      expect(keysOf(publicList)).toEqual(keysOf(realGigPublic))
    })

    it('returns the same pagination fields as the real API', () => {
      expect(keysOf(call('GET', '/api/gigs', null).body.pagination)).toEqual(keysOf(realPagination))
    })

    it('returns the same booking fields as the real API', () => {
      const gig = createGig().body.data
      const booking = call('POST', '/api/bookings', client, { gigId: gig._id }).body.data

      expect(keysOf(booking)).toEqual(keysOf(realBooking))
    })

    it('returns the same payment and income fields as the real API', () => {
      const booking = completedBooking(createGig().body.data._id)
      const paid = call('POST', '/api/transactions', client, { bookingId: booking._id }).body.data
      const income = call('GET', '/api/transactions/income', freelancer).body.data

      expect(keysOf(paid)).toEqual(keysOf(realTransactionPaid))
      expect(keysOf(income)).toEqual(keysOf(realIncome))
      expect(keysOf(income.transactions[0])).toEqual(keysOf(realIncome.transactions[0]))
    })
  })
})
