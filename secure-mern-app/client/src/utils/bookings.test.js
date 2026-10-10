import { describe, expect, it } from 'vitest'
import { buildBookingRows, describePayment } from './bookings'

const gigs = [
  { id: 'g1', title: 'Logo design' },
  { id: 'g2', title: 'React bug fixing' },
]

const bookings = [
  { id: 'b1', gigId: 'g1', status: 'confirmed', createdAt: '2026-09-10T09:00:00.000Z' },
  { id: 'b2', gigId: 'g2', status: 'confirmed', createdAt: '2026-09-12T09:00:00.000Z' },
]

const transactions = [
  { id: 't1', bookingId: 'b1', amount: 500, status: 'simulated-paid' },
  { id: 't2', bookingId: 'b2', amount: 900, status: 'simulated-paid' },
]

describe('buildBookingRows', () => {
  it('joins each booking with its gig title and payment', () => {
    const rows = buildBookingRows(bookings, gigs, transactions)

    expect(rows).toContainEqual({
      id: 'b1',
      gigTitle: 'Logo design',
      status: 'confirmed',
      createdAt: '2026-09-10T09:00:00.000Z',
      amount: 500,
      paymentStatus: 'simulated-paid',
    })
  })

  it('lists the newest booking first', () => {
    const rows = buildBookingRows(bookings, gigs, transactions)
    expect(rows.map((row) => row.id)).toEqual(['b2', 'b1'])
  })

  it('copes with a booking whose gig has been deleted', () => {
    const rows = buildBookingRows(bookings, [gigs[1]], transactions)
    expect(rows.find((row) => row.id === 'b1').gigTitle).toBeNull()
  })

  it('copes with a booking that has no transaction', () => {
    const rows = buildBookingRows(bookings, gigs, [transactions[1]])
    const row = rows.find((item) => item.id === 'b1')

    expect(row.amount).toBeNull()
    expect(row.paymentStatus).toBeNull()
  })

  it('returns an empty list when there are no bookings', () => {
    expect(buildBookingRows([], gigs, transactions)).toEqual([])
  })

  it('does not change the lists it was given', () => {
    const copy = [...bookings]
    buildBookingRows(bookings, gigs, transactions)
    expect(bookings).toEqual(copy)
  })
})

describe('describePayment', () => {
  it('words the simulated payment status for people', () => {
    expect(describePayment('simulated-paid')).toBe('Paid (simulated)')
  })

  it('shows other statuses as they are and a dash when missing', () => {
    expect(describePayment('refunded')).toBe('refunded')
    expect(describePayment(null)).toBe('-')
  })
})
