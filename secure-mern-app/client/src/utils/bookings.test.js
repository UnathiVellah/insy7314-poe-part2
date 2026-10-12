import { describe, expect, it } from 'vitest'
import { availableActions, buildBookingRows, describePayment } from './bookings'

const gigsById = new Map([
  ['g1', { id: 'g1', title: 'Logo design' }],
  ['g2', { id: 'g2', title: 'Copywriting' }],
])

const bookings = [
  { id: 'b1', gigId: 'g1', status: 'completed', amountCents: 50000, createdAt: '2026-09-10T09:00:00.000Z' },
  { id: 'b2', gigId: 'g2', status: 'pending', amountCents: 75000, createdAt: '2026-09-12T09:00:00.000Z' },
]

describe('buildBookingRows', () => {
  it('joins each booking with its gig title and whether it was paid', () => {
    const rows = buildBookingRows(bookings, gigsById, new Set(['b1']))

    expect(rows.find((row) => row.id === 'b1')).toEqual({
      id: 'b1',
      gigTitle: 'Logo design',
      status: 'completed',
      createdAt: '2026-09-10T09:00:00.000Z',
      amountCents: 50000,
      paid: true,
    })
    expect(rows.find((row) => row.id === 'b2')).toMatchObject({ gigTitle: 'Copywriting', paid: false })
  })

  it('lists the newest booking first', () => {
    const rows = buildBookingRows(bookings, gigsById, new Set())

    expect(rows.map((row) => row.id)).toEqual(['b2', 'b1'])
  })

  it('copes with a booking whose gig has been removed', () => {
    const rows = buildBookingRows([{ ...bookings[0], gigId: 'gone' }], gigsById, new Set())

    expect(rows[0].gigTitle).toBeNull()
  })

  it('treats a gig that could not be loaded (null) as missing', () => {
    const rows = buildBookingRows(bookings, new Map([['g1', null]]), new Set())

    expect(rows.find((row) => row.id === 'b1').gigTitle).toBeNull()
  })

  it('does not change the lists it was given', () => {
    const copy = JSON.parse(JSON.stringify(bookings))

    buildBookingRows(bookings, gigsById, new Set(['b1']))

    expect(bookings).toEqual(copy)
  })
})

describe('describePayment', () => {
  it('says a paid booking was paid (simulated)', () => {
    expect(describePayment({ status: 'completed', paid: true })).toBe('Paid (simulated)')
  })

  it('says a completed booking is waiting for the client to pay', () => {
    expect(describePayment({ status: 'completed', paid: false })).toBe('Awaiting payment')
  })

  it('says payment is not due yet while the work is still to be done', () => {
    expect(describePayment({ status: 'pending', paid: false })).toBe('Not due yet')
    expect(describePayment({ status: 'accepted', paid: false })).toBe('Not due yet')
  })

  it('shows a dash for a cancelled booking', () => {
    expect(describePayment({ status: 'cancelled', paid: false })).toBe('-')
  })
})

describe('availableActions', () => {
  const row = (status, paid = false) => ({ status, paid })

  it('lets a freelancer accept a pending booking, then complete an accepted one', () => {
    expect(availableActions(row('pending'), 'freelancer')).toEqual(['accept'])
    expect(availableActions(row('accepted'), 'freelancer')).toEqual(['complete'])
  })

  it('offers a freelancer nothing once a booking is completed or cancelled', () => {
    expect(availableActions(row('completed'), 'freelancer')).toEqual([])
    expect(availableActions(row('cancelled'), 'freelancer')).toEqual([])
  })

  it('lets a client cancel a pending booking', () => {
    expect(availableActions(row('pending'), 'client')).toEqual(['cancel'])
  })

  it('does not let a client cancel once the freelancer has accepted', () => {
    expect(availableActions(row('accepted'), 'client')).toEqual([])
  })

  it('lets a client pay for a completed booking that is not paid yet', () => {
    expect(availableActions(row('completed', false), 'client')).toEqual(['pay'])
  })

  it('does not offer payment twice', () => {
    expect(availableActions(row('completed', true), 'client')).toEqual([])
  })

  it('offers an admin nothing', () => {
    expect(availableActions(row('pending'), 'admin')).toEqual([])
    expect(availableActions(row('completed'), 'admin')).toEqual([])
  })
})
