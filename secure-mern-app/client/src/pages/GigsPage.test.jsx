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
  { id: 'a', ownerId: 'u1', title: 'Logo design', description: 'Three concepts', price: 500, isActive: true, createdAt: '2026-09-01T09:00:00.000Z' },
  { id: 'b', ownerId: 'u1', title: 'React bug fixing', description: 'Debugging a React app', price: 900, isActive: true, createdAt: '2026-09-05T09:00:00.000Z' },
  { id: 'c', ownerId: 'u3', title: 'Copywriting', description: 'Landing page text', price: 750, isActive: true, createdAt: '2026-09-03T09:00:00.000Z' },
]

// What gigService.listGigs resolves with: the gigs plus the API's page details.
const pageOf = (list, overrides = {}) => ({
  gigs: list,
  pagination: { page: 1, limit: 12, total: list.length, totalPages: 1, ...overrides },
})

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
      releaseGigs(pageOf(gigs))
    })

    expect(await screen.findByText('Logo design')).toBeInTheDocument()
    expect(screen.queryByText('Loading gigs...')).not.toBeInTheDocument()

    expect(gigTitles()).toEqual(['React bug fixing', 'Copywriting', 'Logo design'])
    expect(screen.getByText('Showing 3 of 3 gigs')).toBeInTheDocument()
  })

  it('asks the API for the first page of 12 gigs', async () => {
    gigService.listGigs.mockResolvedValue(pageOf(gigs))
    renderApp('/gigs')

    await screen.findByText('Logo design')

    expect(gigService.listGigs).toHaveBeenCalledWith({ page: 1, limit: 12 })
  })

  it('filters gigs as the user types in the search box', async () => {
    gigService.listGigs.mockResolvedValue(pageOf(gigs))
    const user = userEvent.setup()
    renderApp('/gigs')

    await user.type(await screen.findByLabelText('Search gigs'), 'react')

    expect(gigTitles()).toEqual(['React bug fixing'])
    expect(screen.getByText('Showing 1 of 3 gigs')).toBeInTheDocument()
  })

  it('tells the user when nothing matches the search', async () => {
    gigService.listGigs.mockResolvedValue(pageOf(gigs))
    const user = userEvent.setup()
    renderApp('/gigs')

    await user.type(await screen.findByLabelText('Search gigs'), 'plumbing')

    expect(screen.getByText('No gigs match your search.')).toBeInTheDocument()
  })

  it('sorts gigs by price', async () => {
    gigService.listGigs.mockResolvedValue(pageOf(gigs))
    const user = userEvent.setup()
    renderApp('/gigs')

    await user.selectOptions(await screen.findByLabelText('Sort by'), 'price-asc')

    expect(gigTitles()).toEqual(['Logo design', 'Copywriting', 'React bug fixing'])
  })

  it('shows a friendly message when there are no gigs at all', async () => {
    gigService.listGigs.mockResolvedValue(pageOf([]))
    renderApp('/gigs')

    expect(await screen.findByText(/there are no gigs yet/i)).toBeInTheDocument()
  })

  it('shows the error message when the gigs cannot be loaded', async () => {
    gigService.listGigs.mockRejectedValue(new ApiError('Unable to reach the server. Please try again later.', 0))
    renderApp('/gigs')

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server')
    expect(screen.queryByLabelText('Search gigs')).not.toBeInTheDocument()
  })

  describe('load more', () => {
    const firstPage = pageOf(gigs.slice(0, 2), { total: 3, totalPages: 2 })
    const secondPage = pageOf(gigs.slice(2), { page: 2, total: 3, totalPages: 2 })

    it('offers more gigs when the API has another page', async () => {
      gigService.listGigs.mockResolvedValue(firstPage)
      renderApp('/gigs')

      expect(await screen.findByRole('button', { name: 'Load more gigs' })).toBeInTheDocument()
      expect(screen.getByText('Showing 2 of 2 gigs loaded (3 in total)')).toBeInTheDocument()
    })

    it('does not offer more when everything is already shown', async () => {
      gigService.listGigs.mockResolvedValue(pageOf(gigs))
      renderApp('/gigs')

      await screen.findByText('Logo design')

      expect(screen.queryByRole('button', { name: 'Load more gigs' })).not.toBeInTheDocument()
    })

    it('adds the next page to the gigs already shown', async () => {
      gigService.listGigs.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage)
      const user = userEvent.setup()
      renderApp('/gigs')

      await user.click(await screen.findByRole('button', { name: 'Load more gigs' }))

      expect(gigService.listGigs).toHaveBeenLastCalledWith({ page: 2, limit: 12 })
      expect(await screen.findByText('Copywriting')).toBeInTheDocument()
      expect(gigTitles()).toEqual(['React bug fixing', 'Copywriting', 'Logo design'])
      expect(screen.getByText('Showing 3 of 3 gigs')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Load more gigs' })).not.toBeInTheDocument()
    })

    it('does not show a gig twice if it turns up again on the next page', async () => {
      const repeat = pageOf([gigs[1], gigs[2]], { page: 2, total: 3, totalPages: 2 })
      gigService.listGigs.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(repeat)
      const user = userEvent.setup()
      renderApp('/gigs')

      await user.click(await screen.findByRole('button', { name: 'Load more gigs' }))
      await screen.findByText('Copywriting')

      expect(gigTitles()).toEqual(['React bug fixing', 'Copywriting', 'Logo design'])
    })

    it('disables the button while the next page is loading', async () => {
      let releasePage
      gigService.listGigs.mockResolvedValueOnce(firstPage).mockReturnValueOnce(
        new Promise((resolve) => {
          releasePage = resolve
        }),
      )
      const user = userEvent.setup()
      renderApp('/gigs')

      await user.click(await screen.findByRole('button', { name: 'Load more gigs' }))

      expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled()

      await act(async () => {
        releasePage(secondPage)
      })

      expect(await screen.findByText('Copywriting')).toBeInTheDocument()
    })

    it('keeps the gigs shown and lets the user retry when the next page fails', async () => {
      gigService.listGigs
        .mockResolvedValueOnce(firstPage)
        .mockRejectedValueOnce(new ApiError('Unable to reach the server. Please try again later.', 0))
        .mockResolvedValueOnce(secondPage)
      const user = userEvent.setup()
      renderApp('/gigs')

      await user.click(await screen.findByRole('button', { name: 'Load more gigs' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server')
      expect(gigTitles()).toEqual(['React bug fixing', 'Logo design'])

      await user.click(screen.getByRole('button', { name: 'Load more gigs' }))

      expect(await screen.findByText('Copywriting')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('reminds the user that search only covers the gigs loaded so far', async () => {
      gigService.listGigs.mockResolvedValue(firstPage)
      const user = userEvent.setup()
      renderApp('/gigs')

      await user.type(await screen.findByLabelText('Search gigs'), 'plumbing')

      expect(screen.getByText(/load more gigs to search further/i)).toBeInTheDocument()
    })
  })

  it('shows a Book button on every gig to a client', async () => {
    gigService.listGigs.mockResolvedValue(pageOf(gigs))
    renderApp('/gigs')

    await screen.findByText('Logo design')

    expect(screen.getAllByRole('button', { name: /book this gig/i })).toHaveLength(3)
  })

  it('does not show Book buttons to a freelancer', async () => {
    const freelancer = { id: 'u1', fullName: 'Thandi Nkosi', email: 'thandi@example.com', role: 'freelancer' }
    saveAuth('jwt-token', freelancer)
    authService.getCurrentUser.mockResolvedValue(freelancer)
    gigService.listGigs.mockResolvedValue(pageOf(gigs))
    renderApp('/gigs')

    await screen.findByText('Logo design')

    expect(screen.queryByRole('button', { name: /book this gig/i })).not.toBeInTheDocument()
  })

  it('requests a booking straight from the page after confirming', async () => {
    gigService.listGigs.mockResolvedValue(pageOf(gigs))
    bookingService.createBooking.mockResolvedValue({ id: 'b1', gigId: 'a', status: 'pending' })
    const user = userEvent.setup()
    renderApp('/gigs')

    const card = (await screen.findByRole('heading', { name: 'Logo design' })).closest('article')
    await user.click(within(card).getByRole('button', { name: /book this gig/i }))
    await user.click(within(card).getByRole('button', { name: /confirm booking/i }))

    expect(bookingService.createBooking).toHaveBeenCalledWith('a')
    expect(await within(card).findByRole('status')).toHaveTextContent(/booking requested/i)
  })

  it('is reachable from the navigation bar', async () => {
    gigService.listGigs.mockResolvedValue(pageOf(gigs))
    const user = userEvent.setup()
    renderApp('/dashboard')

    const nav = await screen.findByRole('navigation', { name: /main navigation/i })
    await user.click(within(nav).getByRole('link', { name: /browse gigs/i }))

    expect(await screen.findByRole('heading', { name: /browse gigs/i, level: 1 })).toBeInTheDocument()
  })
})
