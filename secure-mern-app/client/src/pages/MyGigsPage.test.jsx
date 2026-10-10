import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, saveAuth } from '../services/api'
import * as authService from '../services/authService'
import * as gigService from '../services/gigService'
import { renderApp } from '../test/renderApp'

vi.mock('../services/authService')
vi.mock('../services/gigService')

const freelancer = { id: 'u1', fullName: 'Thandi Nkosi', email: 'thandi@example.com', role: 'freelancer' }
const client = { id: 'u2', fullName: 'Sipho Dlamini', email: 'sipho@example.com', role: 'client' }

const gigs = [
  { id: 'a', ownerId: 'u1', title: 'Logo design', description: 'Three concepts', price: 500, createdAt: '2026-09-01T09:00:00.000Z' },
  { id: 'b', ownerId: 'u3', title: 'Someone else gig', description: 'Not mine', price: 900, createdAt: '2026-09-05T09:00:00.000Z' },
  { id: 'c', ownerId: 'u1', title: 'Copywriting', description: 'Landing page text', price: 750, createdAt: '2026-09-03T09:00:00.000Z' },
]

const loginAs = (user) => {
  saveAuth('jwt-token', user)
  authService.getCurrentUser.mockResolvedValue(user)
}

const cardTitles = () => screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)

describe('MyGigsPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.resetAllMocks()
    gigService.listGigs.mockResolvedValue(gigs)
  })

  describe('access', () => {
    it('sends a visitor to the login page', () => {
      renderApp('/my-gigs')

      expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
      expect(gigService.listGigs).not.toHaveBeenCalled()
    })

    it('sends a client to their dashboard instead', async () => {
      loginAs(client)
      renderApp('/my-gigs')

      expect(await screen.findByRole('heading', { name: /welcome, sipho dlamini/i })).toBeInTheDocument()
      expect(gigService.listGigs).not.toHaveBeenCalled()
    })

    it('shows the My gigs link to freelancers only', async () => {
      loginAs(freelancer)
      const { unmount } = renderApp('/dashboard')

      const nav = await screen.findByRole('navigation', { name: /main navigation/i })
      expect(within(nav).getByRole('link', { name: 'My gigs' })).toHaveAttribute('href', '/my-gigs')
      expect(screen.getByRole('link', { name: 'Manage my gigs' })).toBeInTheDocument()
      unmount()

      loginAs(client)
      renderApp('/dashboard')

      expect(await screen.findByRole('heading', { name: /welcome, sipho dlamini/i })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'My gigs' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Manage my gigs' })).not.toBeInTheDocument()
    })
  })

  describe('listing', () => {
    it("shows only the freelancer's own gigs, newest first", async () => {
      loginAs(freelancer)
      renderApp('/my-gigs')

      expect(await screen.findByText('Logo design')).toBeInTheDocument()

      expect(cardTitles()).toEqual(['Copywriting', 'Logo design'])
      expect(screen.queryByText('Someone else gig')).not.toBeInTheDocument()
    })

    it('invites the freelancer to create a first gig when they have none', async () => {
      loginAs(freelancer)
      gigService.listGigs.mockResolvedValue([gigs[1]])
      renderApp('/my-gigs')

      expect(await screen.findByText(/you have not created any gigs yet/i)).toBeInTheDocument()
    })

    it('shows the error and hides the New gig button when loading fails', async () => {
      loginAs(freelancer)
      gigService.listGigs.mockRejectedValue(new ApiError('Unable to reach the server. Please try again later.', 0))
      renderApp('/my-gigs')

      expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server')
      expect(screen.queryByRole('button', { name: 'New gig' })).not.toBeInTheDocument()
    })
  })

  describe('managing gigs', () => {
    it('creates a gig and puts it at the top of the list', async () => {
      loginAs(freelancer)
      const created = {
        id: 'd',
        ownerId: 'u1',
        title: 'Brand identity',
        description: 'Logo, colours and fonts',
        price: 1200,
        createdAt: '2026-10-01T09:00:00.000Z',
      }
      gigService.createGig.mockResolvedValue(created)
      const user = userEvent.setup()
      renderApp('/my-gigs')

      await user.click(await screen.findByRole('button', { name: 'New gig' }))
      await user.type(screen.getByLabelText('Title'), 'Brand identity')
      await user.type(screen.getByLabelText('Description'), 'Logo, colours and fonts')
      await user.type(screen.getByLabelText('Price (ZAR)'), '1200')
      await user.click(screen.getByRole('button', { name: 'Create gig' }))

      expect(gigService.createGig).toHaveBeenCalledWith({
        title: 'Brand identity',
        description: 'Logo, colours and fonts',
        price: 1200,
      })
      expect(await screen.findByRole('status')).toHaveTextContent('Your gig has been created.')
      expect(cardTitles()).toEqual(['Brand identity', 'Copywriting', 'Logo design'])
      expect(screen.queryByRole('heading', { name: 'Create a new gig' })).not.toBeInTheDocument()
    })

    it('updates a gig in the list after it is edited', async () => {
      loginAs(freelancer)
      gigService.updateGig.mockResolvedValue({ ...gigs[0], price: 650 })
      const user = userEvent.setup()
      renderApp('/my-gigs')

      await user.click(await screen.findByRole('button', { name: 'Edit Logo design' }))
      const price = screen.getByLabelText('Price (ZAR)')
      await user.clear(price)
      await user.type(price, '650')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(gigService.updateGig).toHaveBeenCalledWith('a', {
        title: 'Logo design',
        description: 'Three concepts',
        price: 650,
      })
      expect(await screen.findByText(/R\s?650/)).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('Your gig has been updated.')
    })

    it('removes a gig from the list once it is deleted', async () => {
      loginAs(freelancer)
      gigService.deleteGig.mockResolvedValue({ id: 'a' })
      const user = userEvent.setup()
      renderApp('/my-gigs')

      await user.click(await screen.findByRole('button', { name: 'Delete Logo design' }))
      await user.click(screen.getByRole('button', { name: 'Yes, delete' }))

      expect(gigService.deleteGig).toHaveBeenCalledWith('a')
      expect(await screen.findByText('Your gig has been deleted.')).toBeInTheDocument()
      expect(cardTitles()).toEqual(['Copywriting'])
    })

    it('closes the new gig form without creating anything when cancelled', async () => {
      loginAs(freelancer)
      const user = userEvent.setup()
      renderApp('/my-gigs')

      await user.click(await screen.findByRole('button', { name: 'New gig' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.queryByRole('heading', { name: 'Create a new gig' })).not.toBeInTheDocument()
      expect(gigService.createGig).not.toHaveBeenCalled()
    })
  })
})
