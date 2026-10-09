import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, saveAuth } from '../services/api'
import * as authService from '../services/authService'
import { renderApp } from '../test/renderApp'

vi.mock('../services/authService')

const client = {
  id: 'u2',
  fullName: 'Sipho Dlamini',
  email: 'sipho@example.com',
  role: 'client',
}

describe('ProtectedRoute and session handling', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.resetAllMocks()
  })

  it('redirects a visitor from /dashboard to the login page', () => {
    renderApp('/dashboard')

    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
    expect(authService.getCurrentUser).not.toHaveBeenCalled()
  })

  it('shows the dashboard to a user with a valid saved session', async () => {
    saveAuth('jwt-token', client)
    authService.getCurrentUser.mockResolvedValue(client)
    renderApp('/dashboard')

    expect(await screen.findByRole('heading', { name: /welcome, sipho dlamini/i })).toBeInTheDocument()
  })

  it('clears the session and redirects when the server rejects the saved token', async () => {
    saveAuth('expired-token', client)
    authService.getCurrentUser.mockRejectedValue(new ApiError('Invalid or expired token', 401))
    renderApp('/dashboard')

    expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument()
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  it('trusts the server over a tampered role in session storage', async () => {
    saveAuth('jwt-token', { ...client, role: 'admin' })
    authService.getCurrentUser.mockResolvedValue(client)
    renderApp('/dashboard')

    expect(await screen.findByText('Sipho Dlamini (client)')).toBeInTheDocument()
    expect(screen.queryByText(/\(admin\)/)).not.toBeInTheDocument()
  })

  it('logs out, clears the session and returns to the login page', async () => {
    saveAuth('jwt-token', client)
    authService.getCurrentUser.mockResolvedValue(client)
    const user = userEvent.setup()
    renderApp('/dashboard')

    await user.click(await screen.findByRole('button', { name: /log out/i }))

    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
    expect(sessionStorage.getItem('token')).toBeNull()
  })
})