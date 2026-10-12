import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, saveAuth } from '../services/api'
import * as authService from '../services/authService'
import * as bookingService from '../services/bookingService'
import * as gigService from '../services/gigService'
import * as transactionService from '../services/transactionService'
import { renderApp } from '../test/renderApp'

vi.mock('../services/authService')
vi.mock('../services/bookingService')
vi.mock('../services/gigService')
vi.mock('../services/transactionService')

const client = { id: 'u2', fullName: 'Sipho Dlamini', email: 'sipho@example.com', role: 'client' }
const freelancer = { id: 'u1', fullName: 'Thandi Nkosi', email: 'thandi@example.com', role: 'freelancer' }
const admin = { id: 'u9', fullName: 'Admin User', email: 'admin@example.com', role: 'admin' }

const gigs = [
  { id: 'g1', ownerId: 'u1', title: 'Logo design', description: 'Three concepts', price: 500, isActive: true, createdAt: '2026-09-01T09:00:00.000Z' },
  { id: 'g2', ownerId: 'u1', title: 'Copywriting', description: 'Landing page text', price: 750, isActive: true, createdAt: '2026-09-03T09:00:00.000Z' },
  { id: 'g3', ownerId: 'u1', title: 'Poster design', description: 'A poster', price: 300, isActive: true, createdAt: '2026-09-04T09:00:00.000Z' },
]

const booking = (overrides) => ({
  clientId: 'u2',
  freelancerId: 'u1',
  ...overrides,
})

// newest first: b3 (pending), b2 (completed, unpaid), b1 (completed, paid)
const bookings = [
  booking({ id: 'b1', gigId: 'g1', status: 'completed', amountCents: 50000, createdAt: '2026-09-10T09:00:00.000Z' }),
  booking({ id: 'b2', gigId: 'g2', status: 'completed', amountCents: 75000, createdAt: '2026-09-12T09:00:00.000Z' }),
  booking({ id: 'b3', gigId: 'g3', status: 'pending', amountCents: 30000, createdAt: '2026-09-14T09:00:00.000Z' }),
]

const payment = { id: 't1', bookingId: 'b1', clientId: 'u2', freelancerId: 'u1', amountCents: 50000, status: 'succeeded', createdAt: '2026-09-11T09:00:00.000Z' }

const income = { totalIncomeCents: 50000, completedPayments: 1, currency: 'ZAR', transactions: [payment] }

const loginAs = (user) => {
  saveAuth('jwt-token', user)
  authService.getCurrentUser.mockResolvedValue(user)
}

// Finds the table row for a gig, e.g. rowFor('Logo design').
const rowFor = (title) => screen.getByText(title).closest('tr')

describe('BookingsPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.resetAllMocks()
    bookingService.listMyBookings.mockResolvedValue(bookings)
    bookingService.listFreelancerBookings.mockResolvedValue(bookings)
    transactionService.listMyTransactions.mockResolvedValue([payment])
    transactionService.getIncome.mockResolvedValue(income)
    gigService.loadGigsById.mockResolvedValue(new Map(gigs.map((gig) => [gig.id, gig])))
    gigService.listMyGigs.mockResolvedValue(gigs)
  })

  it('redirects a visitor to the login page', () => {
    renderApp('/bookings')

    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
    expect(bookingService.listMyBookings).not.toHaveBeenCalled()
  })

  describe('as a client', () => {
    it('shows each booking with its gig, amount, status and payment, newest first', async () => {
      loginAs(client)
      renderApp('/bookings')

      expect(await screen.findByRole('heading', { name: 'My bookings' })).toBeInTheDocument()

      const rows = await screen.findAllByRole('row')
      // rows[0] is the header row
      expect(within(rows[1]).getByText('Poster design')).toBeInTheDocument()
      expect(within(rows[1]).getByText(/R\s?300/)).toBeInTheDocument()
      expect(within(rows[1]).getByText('pending')).toBeInTheDocument()
      expect(within(rows[1]).getByText('Not due yet')).toBeInTheDocument()

      expect(within(rows[2]).getByText('Copywriting')).toBeInTheDocument()
      expect(within(rows[2]).getByText('Awaiting payment')).toBeInTheDocument()

      expect(within(rows[3]).getByText('Logo design')).toBeInTheDocument()
      expect(within(rows[3]).getByText('Paid (simulated)')).toBeInTheDocument()
    })

    it('loads the client\'s bookings, their payments and the gig titles', async () => {
      loginAs(client)
      renderApp('/bookings')

      await screen.findByText('Logo design')

      expect(bookingService.listMyBookings).toHaveBeenCalledTimes(1)
      expect(transactionService.listMyTransactions).toHaveBeenCalledTimes(1)
      expect(gigService.loadGigsById).toHaveBeenCalledWith(['g1', 'g2', 'g3'])
      expect(bookingService.listFreelancerBookings).not.toHaveBeenCalled()
    })

    it('offers Cancel on a pending booking and Pay on an unpaid completed one only', async () => {
      loginAs(client)
      renderApp('/bookings')

      await screen.findByText('Logo design')

      expect(within(rowFor('Poster design')).getByRole('button', { name: /cancel booking/i })).toBeInTheDocument()
      expect(within(rowFor('Copywriting')).getByRole('button', { name: /pay \(simulated\)/i })).toBeInTheDocument()
      expect(within(rowFor('Logo design')).queryByRole('button')).not.toBeInTheDocument()
      expect(within(screen.getByRole('table')).getAllByRole('button')).toHaveLength(2)
    })

    it('pays for a completed booking after confirming, then shows it as paid', async () => {
      loginAs(client)
      transactionService.payBooking.mockResolvedValue({ id: 't2', bookingId: 'b2', amountCents: 75000, status: 'succeeded' })
      const user = userEvent.setup()
      renderApp('/bookings')

      await screen.findByText('Copywriting')
      // After paying, the page reloads and the API now lists the second payment.
      transactionService.listMyTransactions.mockResolvedValue([
        payment,
        { id: 't2', bookingId: 'b2', amountCents: 75000, status: 'succeeded', createdAt: '2026-09-15T09:00:00.000Z' },
      ])

      await user.click(within(rowFor('Copywriting')).getByRole('button', { name: /pay \(simulated\)/i }))
      expect(transactionService.payBooking).not.toHaveBeenCalled()
      await user.click(screen.getByRole('button', { name: 'Pay now' }))

      expect(transactionService.payBooking).toHaveBeenCalledWith('b2')
      expect(await screen.findByRole('status')).toHaveTextContent(/payment of R\s?750[.,]00 recorded \(simulated\)/i)
      expect(bookingService.listMyBookings).toHaveBeenCalledTimes(2)
      expect(within(rowFor('Copywriting')).getByText('Paid (simulated)')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /pay \(simulated\)/i })).not.toBeInTheDocument()
    })

    it('cancels a pending booking after confirming', async () => {
      loginAs(client)
      bookingService.updateBookingStatus.mockResolvedValue({ ...bookings[2], status: 'cancelled' })
      const user = userEvent.setup()
      renderApp('/bookings')

      await screen.findByText('Poster design')
      bookingService.listMyBookings.mockResolvedValue([
        bookings[0],
        bookings[1],
        { ...bookings[2], status: 'cancelled' },
      ])

      await user.click(within(rowFor('Poster design')).getByRole('button', { name: /cancel booking/i }))
      await user.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))

      expect(bookingService.updateBookingStatus).toHaveBeenCalledWith('b3', 'cancelled')
      expect(await screen.findByRole('status')).toHaveTextContent('Booking cancelled.')
      expect(within(rowFor('Poster design')).getByText('cancelled')).toBeInTheDocument()
      expect(within(rowFor('Poster design')).queryByRole('button')).not.toBeInTheDocument()
    })

    it('shows the API\'s message when payment is refused, and reloads to show the true state', async () => {
      loginAs(client)
      transactionService.payBooking.mockRejectedValue(new ApiError('Booking has already been paid', 409))
      const user = userEvent.setup()
      renderApp('/bookings')

      await screen.findByText('Copywriting')
      transactionService.listMyTransactions.mockResolvedValue([
        payment,
        { id: 't2', bookingId: 'b2', amountCents: 75000, status: 'succeeded', createdAt: '2026-09-15T09:00:00.000Z' },
      ])

      await user.click(within(rowFor('Copywriting')).getByRole('button', { name: /pay \(simulated\)/i }))
      await user.click(screen.getByRole('button', { name: 'Pay now' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Booking has already been paid')
      expect(within(rowFor('Copywriting')).getByText('Paid (simulated)')).toBeInTheDocument()
    })

    it('tells a client with no bookings where to start', async () => {
      loginAs(client)
      bookingService.listMyBookings.mockResolvedValue([])
      renderApp('/bookings')

      expect(await screen.findByText(/you have no bookings yet/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /make your first booking/i })).toHaveAttribute('href', '/gigs')
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('says so when the gig behind a booking has been removed', async () => {
      loginAs(client)
      gigService.loadGigsById.mockResolvedValue(new Map([['g1', gigs[0]], ['g2', null], ['g3', gigs[2]]]))
      renderApp('/bookings')

      expect(await screen.findByText('Gig no longer available')).toBeInTheDocument()
    })

    it('shows the error message when the bookings cannot be loaded', async () => {
      loginAs(client)
      bookingService.listMyBookings.mockRejectedValue(
        new ApiError('Unable to reach the server. Please try again later.', 0),
      )
      renderApp('/bookings')

      expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server')
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })

  describe('as a freelancer', () => {
    it('uses freelancer wording and loads the freelancer\'s bookings, income and gigs', async () => {
      loginAs(freelancer)
      renderApp('/bookings')

      expect(await screen.findByRole('heading', { name: 'Bookings on my gigs' })).toBeInTheDocument()
      await screen.findByText('Logo design')

      expect(bookingService.listFreelancerBookings).toHaveBeenCalledTimes(1)
      expect(transactionService.getIncome).toHaveBeenCalledTimes(1)
      expect(gigService.listMyGigs).toHaveBeenCalledTimes(1)
      expect(bookingService.listMyBookings).not.toHaveBeenCalled()
      expect(gigService.loadGigsById).not.toHaveBeenCalled()
    })

    it('shows which bookings have been paid', async () => {
      loginAs(freelancer)
      renderApp('/bookings')

      await screen.findByText('Logo design')

      expect(within(rowFor('Logo design')).getByText('Paid (simulated)')).toBeInTheDocument()
      expect(within(rowFor('Copywriting')).getByText('Awaiting payment')).toBeInTheDocument()
    })

    it('offers Accept on a pending booking and nothing on completed ones', async () => {
      loginAs(freelancer)
      renderApp('/bookings')

      await screen.findByText('Logo design')

      expect(within(rowFor('Poster design')).getByRole('button', { name: /accept/i })).toBeInTheDocument()
      expect(within(screen.getByRole('table')).getAllByRole('button')).toHaveLength(1)
    })

    it('accepts a pending booking with one click and shows the new status', async () => {
      loginAs(freelancer)
      bookingService.updateBookingStatus.mockResolvedValue({ ...bookings[2], status: 'accepted' })
      const user = userEvent.setup()
      renderApp('/bookings')

      await screen.findByText('Poster design')
      bookingService.listFreelancerBookings.mockResolvedValue([
        bookings[0],
        bookings[1],
        { ...bookings[2], status: 'accepted' },
      ])

      await user.click(within(rowFor('Poster design')).getByRole('button', { name: /accept/i }))

      expect(bookingService.updateBookingStatus).toHaveBeenCalledWith('b3', 'accepted')
      expect(await screen.findByRole('status')).toHaveTextContent('Booking accepted.')
      expect(within(rowFor('Poster design')).getByText('accepted')).toBeInTheDocument()
      expect(within(rowFor('Poster design')).getByRole('button', { name: /mark completed/i })).toBeInTheDocument()
    })

    it('marks an accepted booking as completed after confirming', async () => {
      loginAs(freelancer)
      const accepted = { ...bookings[2], status: 'accepted' }
      bookingService.listFreelancerBookings.mockResolvedValue([bookings[0], bookings[1], accepted])
      bookingService.updateBookingStatus.mockResolvedValue({ ...accepted, status: 'completed' })
      const user = userEvent.setup()
      renderApp('/bookings')

      await screen.findByText('Poster design')
      bookingService.listFreelancerBookings.mockResolvedValue([
        bookings[0],
        bookings[1],
        { ...accepted, status: 'completed' },
      ])

      await user.click(within(rowFor('Poster design')).getByRole('button', { name: /mark completed/i }))
      await user.click(screen.getByRole('button', { name: 'Yes, mark completed' }))

      expect(bookingService.updateBookingStatus).toHaveBeenCalledWith('b3', 'completed')
      expect(await screen.findByRole('status')).toHaveTextContent(/now pay for it/i)
      expect(within(rowFor('Poster design')).getByText('Awaiting payment')).toBeInTheDocument()
    })

    it('shows the API\'s message when the booking cannot move on, and reloads', async () => {
      loginAs(freelancer)
      bookingService.updateBookingStatus.mockRejectedValue(
        new ApiError('Booking not found or transition not permitted', 404),
      )
      const user = userEvent.setup()
      renderApp('/bookings')

      await screen.findByText('Poster design')
      await user.click(within(rowFor('Poster design')).getByRole('button', { name: /accept/i }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Booking not found or transition not permitted')
      expect(bookingService.listFreelancerBookings).toHaveBeenCalledTimes(2)
    })

    it('tells a freelancer with no bookings that none have come in yet', async () => {
      loginAs(freelancer)
      bookingService.listFreelancerBookings.mockResolvedValue([])
      renderApp('/bookings')

      expect(await screen.findByText('No clients have booked your gigs yet.')).toBeInTheDocument()
    })
  })

  describe('as an admin', () => {
    it('explains there is no platform-wide list and asks the API for nothing', async () => {
      loginAs(admin)
      renderApp('/bookings')

      expect(await screen.findByText(/no platform-wide bookings list/i)).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      expect(screen.queryByText('Loading bookings...')).not.toBeInTheDocument()
      expect(bookingService.listMyBookings).not.toHaveBeenCalled()
      expect(bookingService.listFreelancerBookings).not.toHaveBeenCalled()
      expect(transactionService.getIncome).not.toHaveBeenCalled()
      expect(transactionService.listMyTransactions).not.toHaveBeenCalled()
    })
  })
})
