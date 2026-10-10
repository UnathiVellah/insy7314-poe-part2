import { describe, expect, it } from 'vitest'
import { averageIncome, buildIncomeRows, groupIncomeByMonth } from './income'

// Mid-month, midday timestamps so the month is the same in any time zone.
const transactions = [
  { id: 't1', bookingId: 'b1', amount: 500, status: 'simulated-paid', createdAt: '2026-07-15T12:00:00.000Z' },
  { id: 't2', bookingId: 'b2', amount: 750, status: 'simulated-paid', createdAt: '2026-09-10T12:00:00.000Z' },
  { id: 't3', bookingId: 'b3', amount: 250, status: 'simulated-paid', createdAt: '2026-09-20T12:00:00.000Z' },
]

describe('averageIncome', () => {
  it('divides the total by the number of transactions', () => {
    expect(averageIncome({ totalIncome: 1500, transactionCount: 3 })).toBe(500)
  })

  it('is zero when there are no transactions', () => {
    expect(averageIncome({ totalIncome: 0, transactionCount: 0 })).toBe(0)
  })
})

describe('groupIncomeByMonth', () => {
  it('adds up income within each month, oldest month first', () => {
    const months = groupIncomeByMonth(transactions)

    expect(months.map((month) => month.key)).toEqual(['2026-07', '2026-09'])
    expect(months.map((month) => month.total)).toEqual([500, 1000])
  })

  it('does not list months that have no income', () => {
    const months = groupIncomeByMonth(transactions)
    expect(months.find((month) => month.key === '2026-08')).toBeUndefined()
  })

  it('labels each month for people', () => {
    const [july] = groupIncomeByMonth(transactions)
    expect(july.label).toMatch(/2026/)
  })

  it('keeps only the most recent months', () => {
    const many = Array.from({ length: 8 }, (_, index) => ({
      id: `t${index}`,
      bookingId: `b${index}`,
      amount: 100,
      createdAt: new Date(2026, index, 15, 12).toISOString(),
    }))

    const months = groupIncomeByMonth(many, 6)

    expect(months).toHaveLength(6)
    expect(months[0].key).toBe('2026-03')
    expect(months[5].key).toBe('2026-08')
  })

  it('ignores transactions with an invalid date and copes with none at all', () => {
    expect(groupIncomeByMonth([{ amount: 100, createdAt: 'not-a-date' }])).toEqual([])
    expect(groupIncomeByMonth([])).toEqual([])
  })
})

describe('buildIncomeRows', () => {
  const bookings = [
    { id: 'b1', gigId: 'g1' },
    { id: 'b2', gigId: 'g2' },
    { id: 'b3', gigId: 'g-deleted' },
  ]
  const gigs = [
    { id: 'g1', title: 'Logo design' },
    { id: 'g2', title: 'React bug fixing' },
  ]

  it('names the gig behind each transaction, newest first', () => {
    const rows = buildIncomeRows(transactions, bookings, gigs)

    expect(rows.map((row) => row.id)).toEqual(['t3', 't2', 't1'])
    expect(rows.find((row) => row.id === 't1').gigTitle).toBe('Logo design')
    expect(rows.find((row) => row.id === 't2').gigTitle).toBe('React bug fixing')
  })

  it('has a null title when the gig has been deleted or the booking is unknown', () => {
    const rows = buildIncomeRows(transactions, bookings.slice(0, 2), gigs)
    expect(rows.find((row) => row.id === 't3').gigTitle).toBeNull()

    const deleted = buildIncomeRows(transactions, bookings, gigs)
    expect(deleted.find((row) => row.id === 't3').gigTitle).toBeNull()
  })

  it('keeps the amount, status and date of each transaction', () => {
    const [first] = buildIncomeRows(transactions, bookings, gigs)

    expect(first).toMatchObject({ amount: 250, status: 'simulated-paid', createdAt: '2026-09-20T12:00:00.000Z' })
  })

  it('does not change the list it was given', () => {
    const copy = [...transactions]
    buildIncomeRows(transactions, bookings, gigs)
    expect(transactions).toEqual(copy)
  })
})
