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

const gigs = [
  { id: 'g1', ownerId: 'u1', title: 'Logo design', description: 'Three concepts', price: 500, createdAt: '2026-06-01T09:00:00.000Z' },
  { id: 'g2', ownerId: 'u1', title: 'Copywriting', description: 'Landing page text', price: 750, createdAt: '2026-06-03T09:00:00.000Z' },
]

const bookings = [
  { id: 'b1', ownerId: 'u2', gigId: 'g1', freelancerId: 'u1', status: 'confirmed', createdAt: '2026-07-15T12:00:00.000Z' },
  { id: 'b2', ownerId: 'u2', gigId: 'g2', freelancerId: 'u1', status: 'confirmed', createdAt: '2026-09-10T12:00:00.000Z' },
  { id: 'b3', ownerId: 'u2', gigId: 'g1', freelancerId: 'u1', status: 'confirmed', createdAt: '2026-09-20T12:00:00.000Z' },
]

const transactions = [
  { id: 't1', ownerId: 'u1', bookingId: 'b1', clientId: 'u2', freelancerId: 'u1', amount: 500, status: 'simulated-paid', createdAt: '2026-07-15T12:00:00.000Z' },
  { id: 't2', ownerId: 'u1', bookingId: 'b2', clientId: 'u2', freelancerId: 'u1', amount: 750, status: 'simulated-paid', createdAt: '2026-09-10T12:00:00.000Z' },
  { id: 't3', ownerId: 'u1', bookingId: 'b3', clientId: 'u2', freelancerId: 'u1', amount: 250, status: 'simulated-paid', createdAt: '2026-09-20T12:00:00.000Z' },
]

const income = { totalIncome: 1500, transactionCount: 3, transactions }

const loginAs = (user) => {
  saveAuth('jwt-token', user)
  authService.getCurrentUser.mockResolvedValue(user)
}

describe('IncomePage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.resetAllMocks()
    transactionService.getIncome.mockResolvedValue(income)
    bookingService.listBookings.mockResolvedValue(bookings)
    gigService.listGigs.mockResolvedValue(gigs)
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
    it('shows the total, the number of bookings and the average', async () => {
      loginAs(freelancer)
      renderApp('/income')

      expect(await screen.findByRole('heading', { name: 'Income', level: 1 })).toBeInTheDocument()

      const total = (await screen.findByText('Total income')).closest('.stat-card')
      expect(total).toHaveTextContent(/R\s?1\D?500/)

      const count = screen.getByText('Bookings', { selector: '.stat-label' }).closest('.stat-card')
      expect(count).toHaveTextContent('3')

      const average = screen.getByText('Average per booking').closest('.stat-card')
      expect(average).toHaveTextContent(/R\s?500/)
    })

    it('draws the monthly chart with one bar per month that earned money', async () => {
      loginAs(freelancer)
      renderApp('/income')

      expect(await screen.findByRole('img', { name: /income per month/i })).toBeInTheDocument()
      expect(screen.getAllByTestId('chart-bar')).toHaveLength(2)
    })

    it('lists each earning with its gig, newest first', async () => {
      loginAs(freelancer)
      renderApp('/income')

      const rows = await screen.findAllByRole('row')
      // rows[0] is the header row
      expect(within(rows[1]).getByText('Logo design')).toBeInTheDocument()
      expect(within(rows[1]).getByText(/R\s?250/)).toBeInTheDocument()
      expect(within(rows[2]).getByText('Copywriting')).toBeInTheDocument()
      expect(within(rows[3]).getByText('Logo design')).toBeInTheDocument()
      expect(screen.getAllByText('Paid (simulated)')).toHaveLength(3)
    })

    it('says so when the gig behind an earning has been deleted', async () => {
      loginAs(freelancer)
      gigService.listGigs.mockResolvedValue([gigs[1]])
      renderApp('/income')

      expect((await screen.findAllByText('Gig no longer available')).length).toBeGreaterThan(0)
    })
  })

  describe('without income or when it cannot load', () => {
    it('explains that nothing has been earned yet and shows no chart or table', async () => {
      loginAs(freelancer)
      transactionService.getIncome.mockResolvedValue({ totalIncome: 0, transactionCount: 0, transactions: [] })
      renderApp('/income')

      expect(await screen.findByText(/you have not earned anything yet/i)).toBeInTheDocument()
      expect(screen.getByText('Total income').closest('.stat-card')).toHaveTextContent(/R\s?0/)
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
