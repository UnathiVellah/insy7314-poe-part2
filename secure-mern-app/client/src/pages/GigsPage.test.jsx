import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, saveAuth } from '../services/api'
import * as authService from '../services/authService'
import * as bookingService from '../services/bookingService'
import * as gigService from '../services/gigService'
import { renderApp } from '../test/renderApp'

vi.mock('../services/authService')
vi.mock('../services/bookingService')
vi.mock('../services/gigService')

const client = { id: 'u2', fullName: 'Sipho Dlamini', email: 'sipho@example.com', role: 'client' }

const gigs = [
  { id: 'a', ownerId: 'u1', title: 'Logo design', description: 'Three concepts', price: 500, createdAt: '2026-09-01T09:00:00.000Z' },
  { id: 'b', ownerId: 'u1', title: 'React bug fixing', description: 'Debugging a React app', price: 900, createdAt: '2026-09-05T09:00:00.000Z' },
  { id: 'c', ownerId: 'u3', title: 'Copywriting', description: 'Landing page text', price: 750, createdAt: '2026-09-03T09:00:00.000Z' },
]

const gigTitles = () => screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)

describe('GigsPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.resetAllMocks()
    saveAuth('jwt-token', client)
    authService.getCurrentUser.mockResolvedValue(client)
  })

  it('redirects a visitor to the login page', () => {
    sessionStorage.clear()
    renderApp('/gigs')

    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
    expect(gigService.listGigs).not.toHaveBeenCalled()
  })

  it('shows a loading message, then every gig newest first', async () => {
    // Hold the response back until the test releases it, so the loading
    // message is guaranteed to be on screen when we check for it.
    let releaseGigs
    gigService.listGigs.mockReturnValue(
      new Promise((resolve) => {
        releaseGigs = resolve
      }),
    )
    renderApp('/gigs')

    expect(await screen.findByText('Loading gigs...')).toBeInTheDocument()

    await act(async () => {
      releaseGigs(gigs)
    })

    expect(await screen.findByText('Logo design')).toBeInTheDocument()
    expect(screen.queryByText('Loading gigs...')).not.toBeInTheDocument()

    expect(gigTitles()).toEqual(['React bug fixing', 'Copywriting', 'Logo design'])
    expect(screen.getByText('Showing 3 of 3 gigs')).toBeInTheDocument()
  })

  it('filters gigs as the user types in the search box', async () => {
    gigService.listGigs.mockResolvedValue(gigs)
    const user = userEvent.setup()
    renderApp('/gigs')

    await user.type(await screen.findByLabelText('Search gigs'), 'react')

    expect(gigTitles()).toEqual(['React bug fixing'])
    expect(screen.getByText('Showing 1 of 3 gigs')).toBeInTheDocument()
  })

  it('tells the user when nothing matches the search', async () => {
    gigService.listGigs.mockResolvedValue(gigs)
    const user = userEvent.setup()
    renderApp('/gigs')

    await user.type(await screen.findByLabelText('Search gigs'), 'plumbing')

    expect(screen.getByText('No gigs match your search.')).toBeInTheDocument()
  })

  it('sorts gigs by price', async () => {
    gigService.listGigs.mockResolvedValue(gigs)
    const user = userEvent.setup()
    renderApp('/gigs')

    await user.selectOptions(await screen.findByLabelText('Sort by'), 'price-asc')

    expect(gigTitles()).toEqual(['Logo design', 'Copywriting', 'React bug fixing'])
  })

  it('shows a friendly message when there are no gigs at all', async () => {
    gigService.listGigs.mockResolvedValue([])
    renderApp('/gigs')

    expect(await screen.findByText(/there are no gigs yet/i)).toBeInTheDocument()
  })

  it('shows the error message when the gigs cannot be loaded', async () => {
    gigService.listGigs.mockRejectedValue(new ApiError('Unable to reach the server. Please try again later.', 0))
    renderApp('/gigs')

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server')
    expect(screen.queryByLabelText('Search gigs')).not.toBeInTheDocument()
  })

  it('shows a Book button on every gig to a client', async () => {
    gigService.listGigs.mockResolvedValue(gigs)
    renderApp('/gigs')

    await screen.findByText('Logo design')

    expect(screen.getAllByRole('button', { name: /book this gig/i })).toHaveLength(3)
  })

  it('does not show Book buttons to a freelancer', async () => {
    const freelancer = { id: 'u1', fullName: 'Thandi Nkosi', email: 'thandi@example.com', role: 'freelancer' }
    saveAuth('jwt-token', freelancer)
    authService.getCurrentUser.mockResolvedValue(freelancer)
    gigService.listGigs.mockResolvedValue(gigs)
    renderApp('/gigs')

    await screen.findByText('Logo design')

    expect(screen.queryByRole('button', { name: /book this gig/i })).not.toBeInTheDocument()
  })

  it('books a gig straight from the page after confirming', async () => {
    gigService.listGigs.mockResolvedValue(gigs)
    bookingService.createBooking.mockResolvedValue({ booking: {}, transaction: {} })
    const user = userEvent.setup()
    renderApp('/gigs')

    const card = (await screen.findByRole('heading', { name: 'Logo design' })).closest('article')
    await user.click(within(card).getByRole('button', { name: /book this gig/i }))
    await user.click(within(card).getByRole('button', { name: /confirm booking/i }))

    expect(bookingService.createBooking).toHaveBeenCalledWith('a')
    expect(await within(card).findByRole('status')).toHaveTextContent(/booking confirmed/i)
  })

  it('is reachable from the navigation bar', async () => {
    gigService.listGigs.mockResolvedValue(gigs)
    const user = userEvent.setup()
    renderApp('/dashboard')

    const nav = await screen.findByRole('navigation', { name: /main navigation/i })
    await user.click(within(nav).getByRole('link', { name: /browse gigs/i }))

    expect(await screen.findByRole('heading', { name: /browse gigs/i, level: 1 })).toBeInTheDocument()
  })
})
