import { describe, expect, it } from 'vitest'
import { averageIncomeCents, buildIncomeRows, groupIncomeByMonth } from './income'

// All amounts are in cents: 50000 is R500.00.

describe('averageIncomeCents', () => {
  it('divides the total by the number of paid bookings', () => {
    expect(averageIncomeCents({ totalIncomeCents: 150000, completedPayments: 3 })).toBe(50000)
  })

  it('rounds to a whole number of cents', () => {
    expect(averageIncomeCents({ totalIncomeCents: 100, completedPayments: 3 })).toBe(33)
  })

  it('is zero when nothing has been paid yet', () => {
    expect(averageIncomeCents({ totalIncomeCents: 0, completedPayments: 0 })).toBe(0)
  })
})

describe('groupIncomeByMonth', () => {
  const transactions = [
    { id: 't1', amountCents: 50000, createdAt: '2026-09-02T10:00:00' },
    { id: 't2', amountCents: 25000, createdAt: '2026-09-20T10:00:00' },
    { id: 't3', amountCents: 100000, createdAt: '2026-08-15T10:00:00' },
  ]

  it('adds up income within each month, oldest month first', () => {
    const months = groupIncomeByMonth(transactions)

    expect(months.map((month) => month.key)).toEqual(['2026-08', '2026-09'])
    expect(months.map((month) => month.total)).toEqual([100000, 75000])
  })

  it('labels each month for the chart', () => {
    const [august] = groupIncomeByMonth(transactions)

    expect(august.label).toMatch(/Aug/)
    expect(august.label).toMatch(/2026/)
  })

  it('keeps only the most recent months', () => {
    const many = Array.from({ length: 8 }, (_, index) => ({
      id: `t${index}`,
      amountCents: 100,
      createdAt: `2026-${String(index + 1).padStart(2, '0')}-10T10:00:00`,
    }))

    const months = groupIncomeByMonth(many, 6)

    expect(months).toHaveLength(6)
    expect(months[0].key).toBe('2026-03')
    expect(months[5].key).toBe('2026-08')
  })

  it('skips a payment with an unreadable date', () => {
    const months = groupIncomeByMonth([{ id: 'x', amountCents: 500, createdAt: 'not a date' }, transactions[0]])

    expect(months).toHaveLength(1)
    expect(months[0].total).toBe(50000)
  })

  it('returns nothing when there are no payments', () => {
    expect(groupIncomeByMonth([])).toEqual([])
  })
})

describe('buildIncomeRows', () => {
  const bookings = [
    { id: 'b1', gigId: 'g1' },
    { id: 'b2', gigId: 'g2' },
  ]
  const gigs = [
    { id: 'g1', title: 'Logo design', isActive: true },
    { id: 'g2', title: 'Old gig', isActive: false },
  ]
  const transactions = [
    { id: 't1', bookingId: 'b1', amountCents: 50000, status: 'succeeded', createdAt: '2026-09-02T10:00:00.000Z' },
    { id: 't2', bookingId: 'b2', amountCents: 25000, status: 'succeeded', createdAt: '2026-09-20T10:00:00.000Z' },
  ]

  it('names the gig behind each payment, newest first', () => {
    const rows = buildIncomeRows(transactions, bookings, gigs)

    expect(rows.map((row) => row.gigTitle)).toEqual(['Old gig', 'Logo design'])
  })

  it('keeps the amount, status and date of each payment', () => {
    const [newest] = buildIncomeRows(transactions, bookings, gigs)

    expect(newest).toMatchObject({
      id: 't2',
      amountCents: 25000,
      status: 'succeeded',
      createdAt: '2026-09-20T10:00:00.000Z',
    })
  })

  it('has no title when the booking or gig cannot be found', () => {
    const rows = buildIncomeRows(
      [{ id: 't9', bookingId: 'unknown', amountCents: 1, status: 'succeeded', createdAt: '2026-09-01T00:00:00.000Z' }],
      bookings,
      gigs,
    )

    expect(rows[0].gigTitle).toBeNull()
  })
})
