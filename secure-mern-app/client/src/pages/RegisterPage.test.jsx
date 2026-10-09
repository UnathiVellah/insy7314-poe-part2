import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/api'
import * as authService from '../services/authService'
import { renderApp } from '../test/renderApp'

vi.mock('../services/authService')

const fillForm = async (user, { password = 'Passw0rd!123', confirmPassword = password } = {}) => {
  await user.type(screen.getByLabelText('Full name'), 'Thandi Nkosi')
  await user.type(screen.getByLabelText('Email'), 'thandi@example.com')
  await user.type(screen.getByLabelText('Password'), password)
  await user.type(screen.getByLabelText('Confirm password'), confirmPassword)
}

describe('RegisterPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.resetAllMocks()
  })

  it('offers only the client and freelancer roles', () => {
    renderApp('/register')

    const options = screen.getAllByRole('option').map((option) => option.value)
    expect(options).toEqual(['client', 'freelancer'])
  })

  it('rejects mismatched passwords without calling the API', async () => {
    const user = userEvent.setup()
    renderApp('/register')

    await fillForm(user, { confirmPassword: 'SomethingElse1' })
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(authService.register).not.toHaveBeenCalled()
  })

  it('registers with the chosen role and sends the user to the login page', async () => {
    authService.register.mockResolvedValue({ id: 'u1', role: 'freelancer' })
    const user = userEvent.setup()
    renderApp('/register')

    await fillForm(user)
    await user.selectOptions(screen.getByLabelText(/i want to join as/i), 'freelancer')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(authService.register).toHaveBeenCalledWith({
      fullName: 'Thandi Nkosi',
      email: 'thandi@example.com',
      password: 'Passw0rd!123',
      role: 'freelancer',
    })
    expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Account created')
  })

  it('shows the API error when the email is already registered', async () => {
    authService.register.mockRejectedValue(new ApiError('User already exists', 409))
    const user = userEvent.setup()
    renderApp('/register')

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('User already exists')
  })
})