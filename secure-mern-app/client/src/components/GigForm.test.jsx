import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import GigForm from './GigForm'

const fillForm = async (user, { title = 'Logo design', description = 'Three concepts', price = '500' } = {}) => {
  await user.type(screen.getByLabelText('Title'), title)
  await user.type(screen.getByLabelText('Description'), description)
  await user.type(screen.getByLabelText('Price (ZAR)'), price)
}

describe('GigForm', () => {
  it('shows validation errors and does not submit an empty form', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<GigForm submitLabel="Create gig" onSubmit={onSubmit} onCancel={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Create gig' }))

    expect(screen.getByText('Title is required.')).toBeInTheDocument()
    expect(screen.getByText('Description is required.')).toBeInTheDocument()
    expect(screen.getByText('Price is required.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a price that is not a positive number', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<GigForm submitLabel="Create gig" onSubmit={onSubmit} onCancel={() => {}} />)

    await fillForm(user, { price: '-5' })
    await user.click(screen.getByRole('button', { name: 'Create gig' }))

    expect(screen.getByText(/greater than 0/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed text and the price as a number', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<GigForm submitLabel="Create gig" onSubmit={onSubmit} onCancel={() => {}} />)

    await fillForm(user, { title: '  Logo design  ', description: '  Three concepts  ', price: '500' })
    await user.click(screen.getByRole('button', { name: 'Create gig' }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Logo design',
      description: 'Three concepts',
      price: 500,
    })
  })

  it('starts with the gig values filled in when editing', () => {
    const gig = { id: 'g1', title: 'Logo design', description: 'Three concepts', price: 500 }
    render(<GigForm initialValues={gig} submitLabel="Save changes" onSubmit={() => {}} onCancel={() => {}} />)

    expect(screen.getByLabelText('Title')).toHaveValue('Logo design')
    expect(screen.getByLabelText('Description')).toHaveValue('Three concepts')
    expect(screen.getByLabelText('Price (ZAR)')).toHaveValue(500)
  })

  it('shows the error when saving fails and lets the user try again', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('You do not have permission to perform this action'))
    const user = userEvent.setup()
    render(<GigForm submitLabel="Create gig" onSubmit={onSubmit} onCancel={() => {}} />)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Create gig' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission')
    expect(screen.getByRole('button', { name: 'Create gig' })).toBeEnabled()
    expect(screen.getByLabelText('Title')).toHaveValue('Logo design')
  })

  it('disables both buttons while saving', async () => {
    let finishSaving
    const onSubmit = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        finishSaving = resolve
      }),
    )
    const user = userEvent.setup()
    render(<GigForm submitLabel="Create gig" onSubmit={onSubmit} onCancel={() => {}} />)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Create gig' }))

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()

    await act(async () => {
      finishSaving()
    })

    expect(screen.getByRole('button', { name: 'Create gig' })).toBeEnabled()
  })

  it('calls onCancel when cancelled', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<GigForm submitLabel="Create gig" onSubmit={() => {}} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
