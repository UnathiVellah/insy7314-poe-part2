import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ManageGigCard from './ManageGigCard'

const gig = {
  id: 'g1',
  ownerId: 'u1',
  title: 'Logo design',
  description: 'Three concepts',
  price: 500,
  createdAt: '2026-09-20T10:00:00.000Z',
}

const renderCard = (props = {}) => {
  const onUpdate = vi.fn().mockResolvedValue(undefined)
  const onDelete = vi.fn().mockResolvedValue(undefined)
  render(<ManageGigCard gig={gig} onUpdate={onUpdate} onDelete={onDelete} {...props} />)
  return { onUpdate, onDelete }
}

describe('ManageGigCard', () => {
  it('shows the gig with Edit and Delete buttons', () => {
    renderCard()

    expect(screen.getByRole('heading', { name: 'Logo design' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Logo design' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Logo design' })).toBeInTheDocument()
  })

  describe('editing', () => {
    it('opens a form filled with the current values', async () => {
      const user = userEvent.setup()
      renderCard()

      await user.click(screen.getByRole('button', { name: 'Edit Logo design' }))

      expect(screen.getByLabelText('Title')).toHaveValue('Logo design')
      expect(screen.getByLabelText('Price (ZAR)')).toHaveValue(500)
    })

    it('saves the changes and returns to the normal view', async () => {
      const user = userEvent.setup()
      const { onUpdate } = renderCard()

      await user.click(screen.getByRole('button', { name: 'Edit Logo design' }))
      const price = screen.getByLabelText('Price (ZAR)')
      await user.clear(price)
      await user.type(price, '650')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(onUpdate).toHaveBeenCalledWith('g1', {
        title: 'Logo design',
        description: 'Three concepts',
        price: 650,
      })
      expect(await screen.findByRole('button', { name: 'Edit Logo design' })).toBeInTheDocument()
    })

    it('stays on the form and shows the error when saving fails', async () => {
      const user = userEvent.setup()
      renderCard({ onUpdate: vi.fn().mockRejectedValue(new Error('Resource not found')) })

      await user.click(screen.getByRole('button', { name: 'Edit Logo design' }))
      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Resource not found')
      expect(screen.getByLabelText('Title')).toBeInTheDocument()
    })

    it('goes back without saving when cancelled', async () => {
      const user = userEvent.setup()
      const { onUpdate } = renderCard()

      await user.click(screen.getByRole('button', { name: 'Edit Logo design' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.getByRole('button', { name: 'Edit Logo design' })).toBeInTheDocument()
      expect(onUpdate).not.toHaveBeenCalled()
    })
  })

  describe('deleting', () => {
    it('asks for confirmation before deleting anything', async () => {
      const user = userEvent.setup()
      const { onDelete } = renderCard()

      await user.click(screen.getByRole('button', { name: 'Delete Logo design' }))

      expect(screen.getByText(/this cannot be undone/i)).toBeInTheDocument()
      expect(onDelete).not.toHaveBeenCalled()
    })

    it('deletes the gig once confirmed', async () => {
      const user = userEvent.setup()
      const { onDelete } = renderCard()

      await user.click(screen.getByRole('button', { name: 'Delete Logo design' }))
      await user.click(screen.getByRole('button', { name: 'Yes, delete' }))

      expect(onDelete).toHaveBeenCalledTimes(1)
      expect(onDelete).toHaveBeenCalledWith('g1')
    })

    it('keeps the gig when the delete is cancelled', async () => {
      const user = userEvent.setup()
      const { onDelete } = renderCard()

      await user.click(screen.getByRole('button', { name: 'Delete Logo design' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.getByRole('button', { name: 'Delete Logo design' })).toBeInTheDocument()
      expect(onDelete).not.toHaveBeenCalled()
    })

    it('disables the buttons while deleting', async () => {
      let finishDelete
      const user = userEvent.setup()
      renderCard({
        onDelete: vi.fn().mockReturnValue(
          new Promise((resolve) => {
            finishDelete = resolve
          }),
        ),
      })

      await user.click(screen.getByRole('button', { name: 'Delete Logo design' }))
      await user.click(screen.getByRole('button', { name: 'Yes, delete' }))

      expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()

      await act(async () => {
        finishDelete()
      })
    })

    it('shows the error and lets the user try again when deleting fails', async () => {
      const user = userEvent.setup()
      renderCard({ onDelete: vi.fn().mockRejectedValue(new Error('Resource not found')) })

      await user.click(screen.getByRole('button', { name: 'Delete Logo design' }))
      await user.click(screen.getByRole('button', { name: 'Yes, delete' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Resource not found')
      expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeEnabled()
    })
  })
})
