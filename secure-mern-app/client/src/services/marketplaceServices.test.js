import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetMockDb } from '../mocks/mockDb'
import { saveAuth } from './api'
import * as bookingService from './bookingService'
import * as gigService from './gigService'
import * as transactionService from './transactionService'

const client = { id: 'u2', fullName: 'Sipho Dlamini', email: 'sipho@example.com', role: 'client' }

const mockFetch = (status, body) => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

describe('marketplace services in real-API mode', () => {
  beforeEach(() => {
    sessionStorage.clear()
    saveAuth('jwt-token', client)
    vi.stubEnv('VITE_USE_MOCKS', 'false')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('lists gigs from GET /api/gigs and unwraps data', async () => {
    mockFetch(200, { data: [{ id: 'g1', title: 'Logo' }] })

    const gigs = await gigService.listGigs()

    expect(gigs).toEqual([{ id: 'g1', title: 'Logo' }])
    const [url, options] = globalThis.fetch.mock.calls[0]
    expect(url).toMatch(/\/api\/gigs$/)
    expect(options.headers.Authorization).toBe('Bearer jwt-token')
  })

  it('creates a gig with POST and a JSON body', async () => {
    mockFetch(201, { data: { id: 'g2' } })
    const gig = { title: 'Logo', description: 'Three concepts', price: 500 }

    await gigService.createGig(gig)

    const [url, options] = globalThis.fetch.mock.calls[0]
    expect(url).toMatch(/\/api\/gigs$/)
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual(gig)
  })

  it('encodes the gig id in the URL', async () => {
    mockFetch(200, { data: {} })

    await gigService.getGig('a/b')

    expect(globalThis.fetch.mock.calls[0][0]).toMatch(/\/api\/gigs\/a%2Fb$/)
  })

  it('books a gig with POST /api/bookings and returns booking and transaction', async () => {
    mockFetch(201, { data: { booking: { id: 'b1' }, transaction: { id: 't1' } } })

    const result = await bookingService.createBooking('g1')

    expect(result).toEqual({ booking: { id: 'b1' }, transaction: { id: 't1' } })
    const [url, options] = globalThis.fetch.mock.calls[0]
    expect(url).toMatch(/\/api\/bookings$/)
    expect(JSON.parse(options.body)).toEqual({ gigId: 'g1' })
  })

  it('reads the income summary from GET /api/transactions/income', async () => {
    mockFetch(200, { data: { totalIncome: 1500, transactionCount: 3, transactions: [] } })

    const income = await transactionService.getIncome()

    expect(income.totalIncome).toBe(1500)
    expect(globalThis.fetch.mock.calls[0][0]).toMatch(/\/api\/transactions\/income$/)
  })
})

describe('marketplace services in mock mode', () => {
  beforeEach(() => {
    sessionStorage.clear()
    resetMockDb()
    saveAuth('jwt-token', client)
    vi.stubEnv('VITE_USE_MOCKS', 'true')
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('serves gigs from the mock data without calling the network', async () => {
    const gigs = await gigService.listGigs()

    expect(gigs.length).toBeGreaterThan(0)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('books a gig through the mock and records the transaction', async () => {
    const [gig] = await gigService.listGigs()

    const { booking, transaction } = await bookingService.createBooking(gig.id)

    expect(booking.gigId).toBe(gig.id)
    expect(transaction.amount).toBe(gig.price)
    expect(await bookingService.listBookings()).toHaveLength(1)
    expect(await transactionService.listTransactions()).toHaveLength(1)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
