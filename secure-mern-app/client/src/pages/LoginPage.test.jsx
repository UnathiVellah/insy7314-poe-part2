import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/api'
import * as authService from '../services/authService'
import { renderApp } from '../test/renderApp'

vi.mock('../services/authService')

const freelancer = {
  id: 'u1',
  fullName: 'Thandi Nkosi',
  email: 'thandi@example.com',
  role: 'freelancer',
}

describe('LoginPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.resetAllMocks()
  })

  it('shows validation errors and does not call the API when the form is empty', async () => {
    const user = userEvent.setup()
    renderApp('/login')

    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    expect(screen.getByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(authService.login).not.toHaveBeenCalled()
  })

  it('shows the API error message when the credentials are wrong', async () => {
    authService.login.mockRejectedValue(new ApiError('Invalid email or password', 401))
    const user = userEvent.setup()
    renderApp('/login')

    await user.type(screen.getByLabelText('Email'), 'thandi@example.com')
    await user.type(screen.getByLabelText('Password'), 'WrongPassword1')
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })

  it('logs the user in, stores the session and shows the dashboard', async () => {
    authService.login.mockResolvedValue({ token: 'jwt-token', user: freelancer })
    const user = userEvent.setup()
    renderApp('/login')

    await user.type(screen.getByLabelText('Email'), 'thandi@example.com')
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!123')
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    expect(await screen.findByRole('heading', { name: /welcome, thandi nkosi/i })).toBeInTheDocument()
    expect(authService.login).toHaveBeenCalledWith('thandi@example.com', 'Passw0rd!123')
    expect(sessionStorage.getItem('token')).toBe('jwt-token')
  })
})