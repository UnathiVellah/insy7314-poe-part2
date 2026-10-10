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

const client = { id: 'u2', fullName: 'Sipho Dlamini', email: 'sipho@example.com', role: 'client' }
const freelancer = { id: 'u1', fullName: 'Thandi Nkosi', email: 'thandi@example.com', role: 'freelancer' }

const gigs = [
  { id: 'g1', ownerId: 'u1', title: 'Logo design', description: 'Three concepts', price: 500, createdAt: '2026-09-01T09:00:00.000Z' },
  { id: 'g2', ownerId: 'u1', title: 'Copywriting', description: 'Landing page text', price: 750, createdAt: '2026-09-03T09:00:00.000Z' },
]

const bookings = [
  { id: 'b1', ownerId: 'u2', gigId: 'g1', freelancerId: 'u1', status: 'confirmed', createdAt: '2026-09-10T09:00:00.000Z' },
  { id: 'b2', ownerId: 'u2', gigId: 'g2', freelancerId: 'u1', status: 'confirmed', createdAt: '2026-09-12T09:00:00.000Z' },
]

const transactions = [
  { id: 't1', ownerId: 'u1', bookingId: 'b1', clientId: 'u2', freelancerId: 'u1', amount: 500, status: 'simulated-paid', createdAt: '2026-09-10T09:00:00.000Z' },
  { id: 't2', ownerId: 'u1', bookingId: 'b2', clientId: 'u2', freelancerId: 'u1', amount: 750, status: 'simulated-paid', createdAt: '2026-09-12T09:00:00.000Z' },
]

const loginAs = (user) => {
  saveAuth('jwt-token', user)
  authService.getCurrentUser.mockResolvedValue(user)
}

describe('BookingsPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.resetAllMocks()
    bookingService.listBookings.mockResolvedValue(bookings)
    gigService.listGigs.mockResolvedValue(gigs)
    transactionService.listTransactions.mockResolvedValue(transactions)
  })

  it('redirects a visitor to the login page', () => {
    renderApp('/bookings')

    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
    expect(bookingService.listBookings).not.toHaveBeenCalled()
  })

  it("shows a client their bookings with the gig, amount and payment status, newest first", async () => {
    loginAs(client)
    renderApp('/bookings')

    expect(await screen.findByRole('heading', { name: 'My bookings' })).toBeInTheDocument()

    const rows = await screen.findAllByRole('row')
    // rows[0] is the header row
    expect(within(rows[1]).getByText('Copywriting')).toBeInTheDocument()
    expect(within(rows[1]).getByText(/R\s?750/)).toBeInTheDocument()
    expect(within(rows[2]).getByText('Logo design')).toBeInTheDocument()
    expect(within(rows[2]).getByText(/R\s?500/)).toBeInTheDocument()
    expect(screen.getAllByText('Paid (simulated)')).toHaveLength(2)
  })

  it('uses freelancer wording when a freelancer opens the page', async () => {
    loginAs(freelancer)
    renderApp('/bookings')

    expect(await screen.findByRole('heading', { name: 'Bookings on my gigs' })).toBeInTheDocument()
  })

  it('tells a client with no bookings where to start', async () => {
    loginAs(client)
    bookingService.listBookings.mockResolvedValue([])
    renderApp('/bookings')

    expect(await screen.findByText(/you have no bookings yet/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /make your first booking/i })).toHaveAttribute('href', '/gigs')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('says so when the gig behind a booking has been deleted', async () => {
    loginAs(client)
    gigService.listGigs.mockResolvedValue([gigs[1]])
    renderApp('/bookings')

    expect(await screen.findByText('Gig no longer available')).toBeInTheDocument()
  })

  it('shows the error message when the bookings cannot be loaded', async () => {
    loginAs(client)
    bookingService.listBookings.mockRejectedValue(
      new ApiError('Unable to reach the server. Please try again later.', 0),
    )
    renderApp('/bookings')

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
