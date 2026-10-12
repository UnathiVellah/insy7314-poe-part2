import { screen, within } from '@testing-library/react'
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

const freelancer = { id: 'u1', fullName: 'Thandi Nkosi', email: 'thandi@example.com', role: 'freelancer' }
const client = { id: 'u2', fullName: 'Sipho Dlamini', email: 'sipho@example.com', role: 'client' }

// The freelancer's gigs, including one they have since removed.
const gigs = [
  { id: 'g1', ownerId: 'u1', title: 'Logo design', description: 'Three concepts', price: 500, isActive: true, createdAt: '2026-06-01T09:00:00.000Z' },
  { id: 'g2', ownerId: 'u1', title: 'Copywriting', description: 'Landing page text', price: 750, isActive: false, createdAt: '2026-06-03T09:00:00.000Z' },
]

const bookings = [
  { id: 'b1', gigId: 'g1', clientId: 'u2', freelancerId: 'u1', amountCents: 50000, status: 'completed', createdAt: '2026-07-15T12:00:00.000Z' },
  { id: 'b2', gigId: 'g2', clientId: 'u2', freelancerId: 'u1', amountCents: 75000, status: 'completed', createdAt: '2026-09-10T12:00:00.000Z' },
  { id: 'b3', gigId: 'g1', clientId: 'u2', freelancerId: 'u1', amountCents: 25000, status: 'completed', createdAt: '2026-09-20T12:00:00.000Z' },
]

// Payments as the API's income summary lists them. Amounts are in cents.
const transactions = [
  { id: 't1', bookingId: 'b1', clientId: null, freelancerId: null, amountCents: 50000, status: 'succeeded', createdAt: '2026-07-15T12:00:00.000Z' },
  { id: 't2', bookingId: 'b2', clientId: null, freelancerId: null, amountCents: 75000, status: 'succeeded', createdAt: '2026-09-10T12:00:00.000Z' },
  { id: 't3', bookingId: 'b3', clientId: null, freelancerId: null, amountCents: 25000, status: 'succeeded', createdAt: '2026-09-20T12:00:00.000Z' },
]

const income = { totalIncomeCents: 150000, completedPayments: 3, currency: 'ZAR', transactions }

const loginAs = (user) => {
  saveAuth('jwt-token', user)
  authService.getCurrentUser.mockResolvedValue(user)
}

describe('IncomePage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.resetAllMocks()
    transactionService.getIncome.mockResolvedValue(income)
    bookingService.listFreelancerBookings.mockResolvedValue(bookings)
    gigService.listMyGigs.mockResolvedValue(gigs)
  })

  describe('access', () => {
    it('sends a visitor to the login page', () => {
      renderApp('/income')

      expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
      expect(transactionService.getIncome).not.toHaveBeenCalled()
    })

    it('sends a client to their dashboard instead', async () => {
      loginAs(client)
      renderApp('/income')

      expect(await screen.findByRole('heading', { name: /welcome, sipho dlamini/i })).toBeInTheDocument()
      expect(transactionService.getIncome).not.toHaveBeenCalled()
    })

    it('shows the Income link and dashboard shortcut to freelancers only', async () => {
      loginAs(freelancer)
      const { unmount } = renderApp('/dashboard')

      const nav = await screen.findByRole('navigation', { name: /main navigation/i })
      expect(within(nav).getByRole('link', { name: 'Income' })).toHaveAttribute('href', '/income')
      expect(screen.getByRole('link', { name: 'View income' })).toBeInTheDocument()
      unmount()

      loginAs(client)
      renderApp('/dashboard')

      expect(await screen.findByRole('heading', { name: /welcome, sipho dlamini/i })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Income' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'View income' })).not.toBeInTheDocument()
    })
  })

  describe('with income', () => {
    it('shows the total, the number of paid bookings and the average, converted from cents', async () => {
      loginAs(freelancer)
      renderApp('/income')

      expect(await screen.findByRole('heading', { name: 'Income', level: 1 })).toBeInTheDocument()

      const total = (await screen.findByText('Total income')).closest('.stat-card')
      expect(total).toHaveTextContent(/R\s?1\D?500[.,]00/)

      const count = screen.getByText('Paid bookings', { selector: '.stat-label' }).closest('.stat-card')
      expect(count).toHaveTextContent('3')

      const average = screen.getByText('Average per booking').closest('.stat-card')
      expect(average).toHaveTextContent(/R\s?500[.,]00/)
    })

    it('loads the summary, the freelancer\'s bookings and their own gigs', async () => {
      loginAs(freelancer)
      renderApp('/income')

      await screen.findByText('Total income')

      expect(transactionService.getIncome).toHaveBeenCalledTimes(1)
      expect(bookingService.listFreelancerBookings).toHaveBeenCalledTimes(1)
      expect(gigService.listMyGigs).toHaveBeenCalledTimes(1)
    })

    it('draws the monthly chart with one bar per month that earned money', async () => {
      loginAs(freelancer)
      renderApp('/income')

      expect(await screen.findByRole('img', { name: /income per month/i })).toBeInTheDocument()
      expect(screen.getAllByTestId('chart-bar')).toHaveLength(2)
    })

    it('lists each payment with its gig, newest first', async () => {
      loginAs(freelancer)
      renderApp('/income')

      const rows = await screen.findAllByRole('row')
      // rows[0] is the header row
      expect(within(rows[1]).getByText('Logo design')).toBeInTheDocument()
      expect(within(rows[1]).getByText(/R\s?250[.,]00/)).toBeInTheDocument()
      expect(within(rows[2]).getByText('Copywriting')).toBeInTheDocument()
      expect(within(rows[2]).getByText(/R\s?750[.,]00/)).toBeInTheDocument()
      expect(within(rows[3]).getByText('Logo design')).toBeInTheDocument()
      expect(within(rows[3]).getByText(/R\s?500[.,]00/)).toBeInTheDocument()
    })

    it('still names a gig that was removed after it earned money', async () => {
      loginAs(freelancer)
      renderApp('/income')

      expect(await screen.findByText('Copywriting')).toBeInTheDocument()
      expect(screen.queryByText('Gig no longer available')).not.toBeInTheDocument()
    })

    it('says so when a payment\'s gig cannot be found', async () => {
      loginAs(freelancer)
      gigService.listMyGigs.mockResolvedValue([gigs[1]])
      renderApp('/income')

      expect((await screen.findAllByText('Gig no longer available')).length).toBeGreaterThan(0)
    })
  })

  describe('without income or when it cannot load', () => {
    it('explains how income arrives and shows no chart or table', async () => {
      loginAs(freelancer)
      transactionService.getIncome.mockResolvedValue({
        totalIncomeCents: 0,
        completedPayments: 0,
        currency: 'ZAR',
        transactions: [],
      })
      renderApp('/income')

      expect(await screen.findByText(/you have not earned anything yet/i)).toBeInTheDocument()
      expect(screen.getByText(/the client has paid/i)).toBeInTheDocument()
      expect(screen.getByText('Total income').closest('.stat-card')).toHaveTextContent(/R\s?0[.,]00/)
      expect(screen.queryByRole('img', { name: /income per month/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('shows the error message when the income cannot be loaded', async () => {
      loginAs(freelancer)
      transactionService.getIncome.mockRejectedValue(
        new ApiError('Unable to reach the server. Please try again later.', 0),
      )
      renderApp('/income')

      expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server')
      expect(screen.queryByText('Total income')).not.toBeInTheDocument()
    })
  })
})
