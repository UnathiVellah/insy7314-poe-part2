import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import BookingActions from './BookingActions'

const makeRow = (overrides = {}) => ({
  id: 'b1',
  gigTitle: 'Logo design',
  status: 'pending',
  createdAt: '2026-09-10T09:00:00.000Z',
  amountCents: 50000,
  paid: false,
  ...overrides,
})

const setup = (row, role) => {
  const onAction = vi.fn().mockResolvedValue(undefined)
  const user = userEvent.setup()
  render(<BookingActions row={row} role={role} onAction={onAction} />)
  return { onAction, user }
}

describe('BookingActions for a freelancer', () => {
  it('accepts a pending booking with a single click', async () => {
    const { onAction, user } = setup(makeRow({ status: 'pending' }), 'freelancer')

    await user.click(screen.getByRole('button', { name: 'Accept: Logo design' }))

    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }), 'accept')
  })

  it('asks before marking an accepted booking as completed', async () => {
    const { onAction, user } = setup(makeRow({ status: 'accepted' }), 'freelancer')

    await user.click(screen.getByRole('button', { name: 'Mark completed: Logo design' }))

    expect(screen.getByText(/mark logo design as completed/i)).toBeInTheDocument()
    expect(screen.getByText(/client will then be able to pay/i)).toBeInTheDocument()
    expect(onAction).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Yes, mark completed' }))

    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }), 'complete')
  })

  it('goes back without completing when the freelancer changes their mind', async () => {
    const { onAction, user } = setup(makeRow({ status: 'accepted' }), 'freelancer')

    await user.click(screen.getByRole('button', { name: 'Mark completed: Logo design' }))
    await user.click(screen.getByRole('button', { name: 'Not yet' }))

    expect(screen.getByRole('button', { name: 'Mark completed: Logo design' })).toBeInTheDocument()
    expect(onAction).not.toHaveBeenCalled()
  })

  it('shows no buttons once the booking is completed', () => {
    setup(makeRow({ status: 'completed' }), 'freelancer')

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('BookingActions for a client', () => {
  it('asks before cancelling a pending booking', async () => {
    const { onAction, user } = setup(makeRow({ status: 'pending' }), 'client')

    await user.click(screen.getByRole('button', { name: 'Cancel booking: Logo design' }))

    expect(screen.getByText(/cancel your booking for logo design/i)).toBeInTheDocument()
    expect(onAction).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))

    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }), 'cancel')
  })

  it('keeps the booking when "Keep booking" is chosen', async () => {
    const { onAction, user } = setup(makeRow({ status: 'pending' }), 'client')

    await user.click(screen.getByRole('button', { name: 'Cancel booking: Logo design' }))
    await user.click(screen.getByRole('button', { name: 'Keep booking' }))

    expect(onAction).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Cancel booking: Logo design' })).toBeInTheDocument()
  })

  it('offers payment on a completed booking and shows the amount before paying', async () => {
    const { onAction, user } = setup(makeRow({ status: 'completed' }), 'client')

    await user.click(screen.getByRole('button', { name: 'Pay (simulated): Logo design' }))

    expect(screen.getByText(/pay R\s?500[.,]00 for logo design/i)).toBeInTheDocument()
    expect(screen.getByText(/no money moves/i)).toBeInTheDocument()
    expect(onAction).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Pay now' }))

    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }), 'pay')
  })

  it('offers no payment once the booking has been paid', () => {
    setup(makeRow({ status: 'completed', paid: true }), 'client')

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('offers nothing while the freelancer is working on it', () => {
    setup(makeRow({ status: 'accepted' }), 'client')

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('disables both buttons while the action is under way', async () => {
    let finish
    const onAction = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const user = userEvent.setup()
    render(<BookingActions row={makeRow({ status: 'completed' })} role="client" onAction={onAction} />)

    await user.click(screen.getByRole('button', { name: 'Pay (simulated): Logo design' }))
    await user.click(screen.getByRole('button', { name: 'Pay now' }))

    expect(screen.getByRole('button', { name: 'Working...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Not now' })).toBeDisabled()

    await act(async () => {
      finish()
    })

    expect(screen.queryByRole('button', { name: 'Working...' })).not.toBeInTheDocument()
  })
})

describe('BookingActions for an admin', () => {
  it('shows no buttons', () => {
    setup(makeRow({ status: 'completed' }), 'admin')

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('BookingActions when the gig is gone', () => {
  it('still works, referring to "this gig"', async () => {
    const { user } = setup(makeRow({ status: 'pending', gigTitle: null }), 'client')

    await user.click(screen.getByRole('button', { name: 'Cancel booking: this gig' }))

    expect(screen.getByText(/cancel your booking for this gig/i)).toBeInTheDocument()
  })
})
