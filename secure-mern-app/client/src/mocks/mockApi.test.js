import { beforeEach, describe, expect, it } from 'vitest'
import { clearAuth, saveAuth } from '../services/api'
import * as mockApi from './mockApi'
import { resetMockDb } from './mockDb'

const freelancer = { id: 'u1', fullName: 'Thandi Nkosi', email: 'thandi@example.com', role: 'freelancer' }
const otherFreelancer = { id: 'u3', fullName: 'Lerato Mokoena', email: 'lerato@example.com', role: 'freelancer' }
const client = { id: 'u2', fullName: 'Sipho Dlamini', email: 'sipho@example.com', role: 'client' }
const admin = { id: 'u9', fullName: 'Administrator', email: 'admin@hustlehub.local', role: 'admin' }

const loginAs = (user) => saveAuth('test-token', user)

const validGig = { title: 'Brand identity', description: 'Logo, colours and fonts.', price: 1200 }

describe('mock API', () => {
  beforeEach(() => {
    sessionStorage.clear()
    resetMockDb()
  })

  describe('authentication', () => {
    it('rejects every call when nobody is logged in', async () => {
      clearAuth()
      await expect(mockApi.listGigs()).rejects.toMatchObject({ status: 401 })
      await expect(mockApi.listBookings()).rejects.toMatchObject({ status: 401 })
    })
  })

  describe('gigs', () => {
    it('lets any logged-in user list and view gigs', async () => {
      loginAs(client)

      const gigs = await mockApi.listGigs()
      expect(gigs.length).toBeGreaterThan(0)

      const gig = await mockApi.getGig(gigs[0].id)
      expect(gig.id).toBe(gigs[0].id)
    })

    it('returns 404 for a gig that does not exist', async () => {
      loginAs(client)
      await expect(mockApi.getGig('nope')).rejects.toMatchObject({ status: 404 })
    })

    it('lets a freelancer create a gig they own', async () => {
      loginAs(freelancer)

      const gig = await mockApi.createGig(validGig)

      expect(gig.ownerId).toBe('u1')
      expect(gig.title).toBe('Brand identity')
      expect(await mockApi.listGigs()).toContainEqual(gig)
    })

    it('forbids a client from creating a gig', async () => {
      loginAs(client)
      await expect(mockApi.createGig(validGig)).rejects.toMatchObject({ status: 403 })
    })

    it('rejects invalid gig input with a 400', async () => {
      loginAs(freelancer)

      await expect(mockApi.createGig({ ...validGig, price: -5 })).rejects.toMatchObject({ status: 400 })
      await expect(mockApi.createGig({ ...validGig, price: '500' })).rejects.toMatchObject({ status: 400 })
      await expect(mockApi.createGig({ ...validGig, title: '   ' })).rejects.toMatchObject({ status: 400 })
    })

    it('lets a freelancer update and delete their own gig', async () => {
      loginAs(freelancer)
      const gig = await mockApi.createGig(validGig)

      const updated = await mockApi.updateGig(gig.id, { ...validGig, price: 1500 })
      expect(updated.price).toBe(1500)

      await mockApi.deleteGig(gig.id)
      await expect(mockApi.getGig(gig.id)).rejects.toMatchObject({ status: 404 })
    })

    it("answers 404 when a freelancer edits or deletes someone else's gig", async () => {
      loginAs(freelancer)
      const gig = await mockApi.createGig(validGig)

      loginAs(otherFreelancer)
      await expect(mockApi.updateGig(gig.id, validGig)).rejects.toMatchObject({ status: 404 })
      await expect(mockApi.deleteGig(gig.id)).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('bookings and transactions', () => {
    const bookFirstGig = async () => {
      loginAs(freelancer)
      const gig = await mockApi.createGig(validGig)
      loginAs(client)
      return { gig, result: await mockApi.createBooking(gig.id) }
    }

    it('creates a booking and a linked simulated transaction', async () => {
      const { gig, result } = await bookFirstGig()

      expect(result.booking).toMatchObject({
        ownerId: 'u2',
        gigId: gig.id,
        freelancerId: 'u1',
        status: 'confirmed',
      })
      expect(result.transaction).toMatchObject({
        ownerId: 'u1',
        bookingId: result.booking.id,
        clientId: 'u2',
        freelancerId: 'u1',
        amount: 1200,
        status: 'simulated-paid',
      })
    })

    it('forbids freelancers from booking and 404s for unknown gigs', async () => {
      loginAs(freelancer)
      await expect(mockApi.createBooking('gig-seed-1')).rejects.toMatchObject({ status: 403 })

      loginAs(client)
      await expect(mockApi.createBooking('nope')).rejects.toMatchObject({ status: 404 })
    })

    it('shows each role only its own bookings and transactions', async () => {
      await bookFirstGig()

      loginAs(client)
      expect(await mockApi.listBookings()).toHaveLength(1)
      expect(await mockApi.listTransactions()).toHaveLength(1)

      loginAs(freelancer)
      expect(await mockApi.listBookings()).toHaveLength(1)
      expect(await mockApi.listTransactions()).toHaveLength(1)

      loginAs(otherFreelancer)
      expect(await mockApi.listBookings()).toHaveLength(0)
      expect(await mockApi.listTransactions()).toHaveLength(0)

      loginAs(admin)
      expect(await mockApi.listBookings()).toHaveLength(1)
      expect(await mockApi.listTransactions()).toHaveLength(1)
    })

    it("totals a freelancer's income across bookings", async () => {
      await bookFirstGig()
      loginAs(client)
      await mockApi.createBooking(
        (await mockApi.listGigs()).find((gig) => gig.ownerId === 'u1').id,
      )

      loginAs(freelancer)
      const income = await mockApi.getIncome()

      expect(income.totalIncome).toBe(2400)
      expect(income.transactionCount).toBe(2)
      expect(income.transactions).toHaveLength(2)
    })

    it('only lets freelancers read the income summary', async () => {
      loginAs(client)
      await expect(mockApi.getIncome()).rejects.toMatchObject({ status: 403 })
    })
  })
})
