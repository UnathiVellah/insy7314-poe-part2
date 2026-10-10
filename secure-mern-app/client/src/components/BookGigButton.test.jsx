import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/api'
import * as bookingService from '../services/bookingService'
import BookGigButton from './BookGigButton'

vi.mock('../services/bookingService')

const gig = {
  id: 'g1',
  ownerId: 'u1',
  title: 'Logo design',
  description: 'Three concepts',
  price: 500,
  createdAt: '2026-09-20T10:00:00.000Z',
}

const renderButton = () =>
  render(
    <MemoryRouter>
      <BookGigButton gig={gig} />
    </MemoryRouter>,
  )

describe('BookGigButton', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('asks for confirmation before booking anything', async () => {
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: /book this gig/i }))

    expect(screen.getByText(/for R\s?500/)).toBeInTheDocument()
    expect(screen.getByText(/payment is simulated/i)).toBeInTheDocument()
    expect(bookingService.createBooking).not.toHaveBeenCalled()
  })

  it('goes back to the start without booking when cancelled', async () => {
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: /book this gig/i }))
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByRole('button', { name: /book this gig/i })).toBeInTheDocument()
    expect(bookingService.createBooking).not.toHaveBeenCalled()
  })

  it('books the gig once confirmed and offers a link to the bookings page', async () => {
    bookingService.createBooking.mockResolvedValue({ booking: { id: 'b1' }, transaction: { id: 't1' } })
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: /book this gig/i }))
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    expect(bookingService.createBooking).toHaveBeenCalledTimes(1)
    expect(bookingService.createBooking).toHaveBeenCalledWith('g1')
    expect(await screen.findByRole('status')).toHaveTextContent(/booking confirmed/i)
    expect(screen.getByRole('link', { name: /view my bookings/i })).toHaveAttribute('href', '/bookings')
  })

  it('disables both buttons while the booking is being made', async () => {
    let finishBooking
    bookingService.createBooking.mockReturnValue(
      new Promise((resolve) => {
        finishBooking = resolve
      }),
    )
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: /book this gig/i }))
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    expect(screen.getByRole('button', { name: /booking\.\.\./i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()

    await act(async () => {
      finishBooking({ booking: {}, transaction: {} })
    })

    expect(await screen.findByRole('status')).toHaveTextContent(/booking confirmed/i)
  })

  it('shows the error and lets the user try again when booking fails', async () => {
    bookingService.createBooking.mockRejectedValueOnce(
      new ApiError('You do not have permission to perform this action', 403),
    )
    bookingService.createBooking.mockResolvedValueOnce({ booking: {}, transaction: {} })
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: /book this gig/i }))
    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission')

    await user.click(screen.getByRole('button', { name: /confirm booking/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/booking confirmed/i)
    expect(bookingService.createBooking).toHaveBeenCalledTimes(2)
  })
})
