import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetMockStore } from '../mocks/mockStore'
import {
  realBooking,
  realGigCreated,
  realGigPublic,
  realIncome,
  realPagination,
  realTransactionPaid,
} from '../test/realApiSamples'
import { saveAuth } from './api'
import * as bookingService from './bookingService'
import * as gigService from './gigService'
import * as transactionService from './transactionService'

const client = { id: '65f0000000000000000000c1', fullName: 'Sipho Dlamini', email: 'sipho@example.com', role: 'client' }

const mockFetch = (status, body) => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

const lastCall = () => globalThis.fetch.mock.calls[0]

describe('marketplace services talking to the real API', () => {
  beforeEach(() => {
    sessionStorage.clear()
    saveAuth('jwt-token', client)
    vi.stubEnv('VITE_USE_MOCKS', 'false')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  describe('gigs', () => {
    it('asks for one page of gigs and turns them into the shape the pages use', async () => {
      mockFetch(200, { data: [realGigPublic], pagination: realPagination })

      const result = await gigService.listGigs({ page: 2, limit: 5 })

      const [url, options] = lastCall()
      expect(url).toMatch(/\/api\/gigs\?page=2&limit=5$/)
      expect(options.headers.Authorization).toBe('Bearer jwt-token')
      expect(result.pagination).toEqual(realPagination)
      expect(result.gigs).toEqual([
        {
          id: '6acce8ab3a0ed0d66f2480d0',
          ownerId: '6acce8ab3a0ed0d66f2480c7',
          title: 'Logo design & branding',
          description: "Three concepts, one revision round, and it's all included.",
          category: 'Writing & Translation',
          price: 20,
          isActive: true,
          createdAt: '2026-10-12T14:03:23.655Z',
        },
      ])
    })

    it('asks for the first page of 12 by default', async () => {
      mockFetch(200, { data: [], pagination: realPagination })

      await gigService.listGigs()

      expect(lastCall()[0]).toMatch(/\/api\/gigs\?page=1&limit=12$/)
    })

    it('loads the freelancer\'s own gigs, removed ones included', async () => {
      mockFetch(200, { data: [{ ...realGigCreated, isActive: false }] })

      const gigs = await gigService.listMyGigs()

      expect(lastCall()[0]).toMatch(/\/api\/gigs\/mine$/)
      expect(gigs).toHaveLength(1)
      expect(gigs[0].isActive).toBe(false)
    })

    it('encodes the gig id in the URL', async () => {
      mockFetch(200, { data: realGigPublic })

      await gigService.getGig('a/b')

      expect(lastCall()[0]).toMatch(/\/api\/gigs\/a%2Fb$/)
    })

    it('creates a gig with POST and a JSON body', async () => {
      mockFetch(201, { data: realGigCreated })
      const gig = { title: 'Logo design', description: 'Three concepts and a revision', category: 'Design', price: 500 }

      const created = await gigService.createGig(gig)

      const [url, options] = lastCall()
      expect(url).toMatch(/\/api\/gigs$/)
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body)).toEqual(gig)
      expect(created.id).toBe('6acce8ab3a0ed0d66f2480d0')
    })

    it('updates a gig with PUT', async () => {
      mockFetch(200, { data: realGigCreated })

      await gigService.updateGig('g1', { title: 'New title' })

      const [url, options] = lastCall()
      expect(url).toMatch(/\/api\/gigs\/g1$/)
      expect(options.method).toBe('PUT')
    })

    it('deletes a gig with DELETE and resolves with nothing', async () => {
      mockFetch(200, { message: 'Gig deleted' })

      await expect(gigService.deleteGig('g1')).resolves.toBeUndefined()

      const [url, options] = lastCall()
      expect(url).toMatch(/\/api\/gigs\/g1$/)
      expect(options.method).toBe('DELETE')
    })

    it('looks up each gig once and gives null for one that is gone', async () => {
      globalThis.fetch = vi.fn((url) =>
        Promise.resolve(
          url.endsWith('/gone')
            ? { ok: false, status: 404, json: () => Promise.resolve({ error: 'Gig not found' }) }
            : { ok: true, status: 200, json: () => Promise.resolve({ data: realGigPublic }) },
        ),
      )

      const gigs = await gigService.loadGigsById(['g1', 'gone', 'g1'])

      expect(globalThis.fetch).toHaveBeenCalledTimes(2)
      expect(gigs.get('g1').title).toBe('Logo design & branding')
      expect(gigs.get('gone')).toBeNull()
      expect(gigs.size).toBe(2)
    })
  })

  describe('bookings', () => {
    it('books a gig with POST /api/bookings and returns a pending booking', async () => {
      mockFetch(201, { data: realBooking })

      const booking = await bookingService.createBooking('6acce8ab3a0ed0d66f2480d0')

      const [url, options] = lastCall()
      expect(url).toMatch(/\/api\/bookings$/)
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body)).toEqual({ gigId: '6acce8ab3a0ed0d66f2480d0' })
      expect(booking).toEqual({
        id: '6acce8ab3a0ed0d66f2480db',
        gigId: '6acce8ab3a0ed0d66f2480d0',
        clientId: '6acce8ab3a0ed0d66f2480ca',
        freelancerId: '6acce8ab3a0ed0d66f2480c7',
        amountCents: 2000,
        status: 'pending',
        createdAt: '2026-10-12T14:03:23.720Z',
      })
    })

    it('lists a client\'s bookings from /api/bookings/mine', async () => {
      mockFetch(200, { data: [realBooking] })

      const bookings = await bookingService.listMyBookings()

      expect(lastCall()[0]).toMatch(/\/api\/bookings\/mine$/)
      expect(bookings[0].id).toBe('6acce8ab3a0ed0d66f2480db')
    })

    it('lists a freelancer\'s bookings from /api/bookings/freelancer', async () => {
      mockFetch(200, { data: [realBooking] })

      await bookingService.listFreelancerBookings()

      expect(lastCall()[0]).toMatch(/\/api\/bookings\/freelancer$/)
    })

    it('changes a booking\'s status with PATCH', async () => {
      mockFetch(200, { data: { ...realBooking, status: 'accepted' } })

      const booking = await bookingService.updateBookingStatus('b1', 'accepted')

      const [url, options] = lastCall()
      expect(url).toMatch(/\/api\/bookings\/b1\/status$/)
      expect(options.method).toBe('PATCH')
      expect(JSON.parse(options.body)).toEqual({ status: 'accepted' })
      expect(booking.status).toBe('accepted')
    })

    it('passes the API\'s refusal on as an error', async () => {
      mockFetch(404, { error: 'Booking not found or transition not permitted' })

      await expect(bookingService.updateBookingStatus('b1', 'completed')).rejects.toMatchObject({
        status: 404,
        message: 'Booking not found or transition not permitted',
      })
    })
  })

  describe('transactions', () => {
    it('pays for a booking with POST /api/transactions', async () => {
      mockFetch(201, { message: 'Simulated payment successful', data: realTransactionPaid })

      const transaction = await transactionService.payBooking('6acce8ab3a0ed0d66f2480db')

      const [url, options] = lastCall()
      expect(url).toMatch(/\/api\/transactions$/)
      expect(JSON.parse(options.body)).toEqual({ bookingId: '6acce8ab3a0ed0d66f2480db' })
      expect(transaction).toMatchObject({
        id: '6acce8ab3a0ed0d66f2480ee',
        bookingId: '6acce8ab3a0ed0d66f2480db',
        amountCents: 2000,
        status: 'succeeded',
      })
    })

    it('reports an attempt to pay twice', async () => {
      mockFetch(409, { error: 'Booking has already been paid' })

      await expect(transactionService.payBooking('b1')).rejects.toMatchObject({
        status: 409,
        message: 'Booking has already been paid',
      })
    })

    it('lists a client\'s payments from /api/transactions/mine', async () => {
      mockFetch(200, { data: [realTransactionPaid] })

      const transactions = await transactionService.listMyTransactions()

      expect(lastCall()[0]).toMatch(/\/api\/transactions\/mine$/)
      expect(transactions[0].bookingId).toBe('6acce8ab3a0ed0d66f2480db')
    })

    it('reads the income summary in cents from /api/transactions/income', async () => {
      mockFetch(200, { data: realIncome })

      const income = await transactionService.getIncome()

      expect(lastCall()[0]).toMatch(/\/api\/transactions\/income$/)
      expect(income).toMatchObject({ totalIncomeCents: 2000, completedPayments: 1, currency: 'ZAR' })
      expect(income.transactions[0]).toMatchObject({
        id: '6acce8ab3a0ed0d66f2480ee',
        bookingId: '6acce8ab3a0ed0d66f2480db',
        amountCents: 2000,
      })
    })
  })
})

describe('marketplace services with the built-in fake data', () => {
  const freelancer = {
    id: '65f0000000000000000000f1',
    fullName: 'Thandi Nkosi',
    email: 'thandi@example.com',
    role: 'freelancer',
  }

  const signInAs = (user) => saveAuth('jwt-token', user)

  beforeEach(() => {
    sessionStorage.clear()
    resetMockStore()
    signInAs(client)
    vi.stubEnv('VITE_USE_MOCKS', 'true')
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('serves gigs without calling the network', async () => {
    const { gigs, pagination } = await gigService.listGigs()

    expect(gigs.length).toBeGreaterThan(0)
    expect(pagination.total).toBe(gigs.length)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('carries a booking all the way from request to payment and income', async () => {
    const { gigs } = await gigService.listGigs()
    const gig = gigs.find((item) => item.ownerId === freelancer.id)

    // The client books the gig: it starts pending and nothing is paid yet.
    const booking = await bookingService.createBooking(gig.id)
    expect(booking).toMatchObject({ gigId: gig.id, status: 'pending', amountCents: gig.price * 100 })
    await expect(transactionService.payBooking(booking.id)).rejects.toMatchObject({ status: 404 })

    // The freelancer accepts it, then completes it.
    signInAs(freelancer)
    expect(await bookingService.listFreelancerBookings()).toHaveLength(1)
    expect((await bookingService.updateBookingStatus(booking.id, 'accepted')).status).toBe('accepted')
    expect((await bookingService.updateBookingStatus(booking.id, 'completed')).status).toBe('completed')

    // The client pays once; a second payment is refused.
    signInAs(client)
    const payment = await transactionService.payBooking(booking.id)
    expect(payment).toMatchObject({ bookingId: booking.id, amountCents: gig.price * 100, status: 'succeeded' })
    await expect(transactionService.payBooking(booking.id)).rejects.toMatchObject({ status: 409 })
    expect(await transactionService.listMyTransactions()).toHaveLength(1)

    // The freelancer's income now includes it.
    signInAs(freelancer)
    const income = await transactionService.getIncome()
    expect(income.totalIncomeCents).toBe(gig.price * 100)
    expect(income.completedPayments).toBe(1)
    expect(income.transactions[0].bookingId).toBe(booking.id)

    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('lets a client cancel a booking only while it is pending', async () => {
    const { gigs } = await gigService.listGigs()
    const booking = await bookingService.createBooking(gigs[0].id)

    expect((await bookingService.updateBookingStatus(booking.id, 'cancelled')).status).toBe('cancelled')
    await expect(bookingService.updateBookingStatus(booking.id, 'cancelled')).rejects.toMatchObject({ status: 404 })
  })

  it('refuses a gig change from someone who is not a freelancer', async () => {
    await expect(
      gigService.createGig({
        title: 'Brand identity pack',
        description: 'Logo, colour palette and font pairing.',
        category: 'Design',
        price: 900,
      }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('still sends login and profile requests to the real API', async () => {
    const { apiRequest } = await import('./api')
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: {} }) })

    await apiRequest('/api/auth/me')

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })
})
