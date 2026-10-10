import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import IncomeChart from './IncomeChart'
import StatCard from './StatCard'

const months = [
  { key: '2026-08', label: 'Aug 2026', total: 500 },
  { key: '2026-09', label: 'Sept 2026', total: 1000 },
]

describe('IncomeChart', () => {
  it('draws one bar per month', () => {
    render(<IncomeChart months={months} />)
    expect(screen.getAllByTestId('chart-bar')).toHaveLength(2)
  })

  it('describes the figures in text for screen readers', () => {
    render(<IncomeChart months={months} />)

    const chart = screen.getByRole('img')
    expect(chart).toHaveAccessibleName(/income per month/i)
    expect(chart).toHaveAccessibleName(/Aug 2026 R\s?500/)
    expect(chart).toHaveAccessibleName(/Sept 2026 R\s?1\D?000/)
  })

  it('labels each bar with its month and amount', () => {
    render(<IncomeChart months={months} />)

    expect(screen.getByText('Aug 2026')).toBeInTheDocument()
    expect(screen.getByText('Sept 2026')).toBeInTheDocument()
    expect(screen.getByText(/R\s?1\D?000/, { selector: 'text' })).toBeInTheDocument()
  })

  it('makes the biggest month the tallest bar', () => {
    const { container } = render(<IncomeChart months={months} />)

    const [smaller, bigger] = [...container.querySelectorAll('rect.chart-bar')].map((bar) =>
      Number(bar.getAttribute('height')),
    )

    expect(bigger).toBeGreaterThan(smaller)
    expect(smaller).toBeCloseTo(bigger / 2, 0)
  })

  it('draws nothing when there is no income', () => {
    const { container } = render(<IncomeChart months={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('StatCard', () => {
  it('shows the label, value and optional hint', () => {
    render(<StatCard label="Total income" value="R 1 500,00" hint="From 3 bookings" />)

    expect(screen.getByText('Total income')).toBeInTheDocument()
    expect(screen.getByText('R 1 500,00')).toBeInTheDocument()
    expect(screen.getByText('From 3 bookings')).toBeInTheDocument()
  })

  it('leaves out the hint when there is none', () => {
    const { container } = render(<StatCard label="Total income" value="R 0,00" />)
    expect(container.querySelector('.stat-hint')).toBeNull()
  })
})
