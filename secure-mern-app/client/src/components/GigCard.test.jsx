import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import GigCard from './GigCard'

const gig = {
  id: 'g1',
  ownerId: 'u1',
  title: 'Logo design',
  description: 'Three concepts and one revision',
  price: 500,
  createdAt: '2026-09-20T10:00:00.000Z',
}

describe('GigCard', () => {
  it('shows the title, description, price and listing date', () => {
    render(<GigCard gig={gig} />)

    expect(screen.getByRole('heading', { name: 'Logo design' })).toBeInTheDocument()
    expect(screen.getByText('Three concepts and one revision')).toBeInTheDocument()
    expect(screen.getByText(/R\s?500/)).toBeInTheDocument()
    expect(screen.getByText(/listed .*2026/i)).toBeInTheDocument()
  })

  it('renders extra content such as action buttons passed as children', () => {
    render(
      <GigCard gig={gig}>
        <button type="button">Book this gig</button>
      </GigCard>,
    )

    expect(screen.getByRole('button', { name: 'Book this gig' })).toBeInTheDocument()
  })

  it('renders user-supplied text as plain text, not HTML', () => {
    const hostile = {
      ...gig,
      title: '<img src=x onerror=alert(1)>',
      description: '<script>alert("xss")</script>',
    }

    const { container } = render(<GigCard gig={hostile} />)

    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
  })
})
