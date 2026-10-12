import { describe, expect, it } from 'vitest'
import {
  normalizeBooking,
  normalizeGig,
  normalizeIncome,
  normalizeTransaction,
  normalizeUser,
} from './normalize'

// These samples are real responses captured from the running API.
const rawGig = {
  _id: '6acce8ab3a0ed0d66f2480d0',
  title: 'Logo design & branding',
  description: "Three concepts, one revision round, and it's all included.",
  category: 'Writing & Translation',
  price: 20,
  freelancer: '6acce8ab3a0ed0d66f2480c7',
  isActive: true,
  createdAt: '2026-10-12T14:03:23.655Z',
  updatedAt: '2026-10-12T14:03:23.655Z',
}

const rawBooking = {
  _id: '6acce8ab3a0ed0d66f2480db',
  gig: '6acce8ab3a0ed0d66f2480d0',
  client: '6acce8ab3a0ed0d66f2480ca',
  freelancer: '6acce8ab3a0ed0d66f2480c7',
  agreedPriceCents: 2000,
  status: 'pending',
  createdAt: '2026-10-12T14:03:23.720Z',
  updatedAt: '2026-10-12T14:03:23.720Z',
}

const rawTransaction = {
  _id: '6acce8ab3a0ed0d66f2480ee',
  booking: '6acce8ab3a0ed0d66f2480db',
  client: '6acce8ab3a0ed0d66f2480ca',
  freelancer: '6acce8ab3a0ed0d66f2480c7',
  amountCents: 2000,
  status: 'succeeded',
  paymentMethod: 'simulated',
  createdAt: '2026-10-12T14:03:23.841Z',
  updatedAt: '2026-10-12T14:03:23.841Z',
  amountFormatted: 'R20.00',
}

describe('normalizeUser', () => {
  it('keeps the name exactly as the API sent it', () => {
    expect(
      normalizeUser({
        id: '6acce8ab3a0ed0d66f2480c7',
        fullName: "Thandi O'Brien & Co",
        email: 'thandi@example.com',
        role: 'freelancer',
      }),
    ).toEqual({
      id: '6acce8ab3a0ed0d66f2480c7',
      fullName: "Thandi O'Brien & Co",
      email: 'thandi@example.com',
      role: 'freelancer',
    })
  })

  it('does not change text that merely looks like an HTML escape', () => {
    // A person can legitimately type these characters. The API stores them as
    // typed, so they must come back unchanged.
    expect(normalizeUser({ id: '1', fullName: 'R&amp;D Team', email: 'a@b.co', role: 'client' }).fullName).toBe(
      'R&amp;D Team',
    )
  })
})

describe('normalizeGig', () => {
  it('renames the API fields and keeps the text as sent', () => {
    expect(normalizeGig(rawGig)).toEqual({
      id: '6acce8ab3a0ed0d66f2480d0',
      ownerId: '6acce8ab3a0ed0d66f2480c7',
      title: 'Logo design & branding',
      description: "Three concepts, one revision round, and it's all included.",
      category: 'Writing & Translation',
      price: 20,
      isActive: true,
      createdAt: '2026-10-12T14:03:23.655Z',
    })
  })

  it('treats a gig from the public list, which has no isActive field, as active', () => {
    const { isActive, ...publicGig } = rawGig
    expect(isActive).toBe(true)
    expect(normalizeGig(publicGig).isActive).toBe(true)
  })

  it('keeps a removed gig marked as inactive', () => {
    expect(normalizeGig({ ...rawGig, isActive: false }).isActive).toBe(false)
  })

  it('leaves out fields the pages never use', () => {
    expect(normalizeGig(rawGig)).not.toHaveProperty('_id')
    expect(normalizeGig(rawGig)).not.toHaveProperty('freelancer')
    expect(normalizeGig(rawGig)).not.toHaveProperty('updatedAt')
  })
})

describe('normalizeBooking', () => {
  it('renames the API fields and keeps the price in cents', () => {
    expect(normalizeBooking(rawBooking)).toEqual({
      id: '6acce8ab3a0ed0d66f2480db',
      gigId: '6acce8ab3a0ed0d66f2480d0',
      clientId: '6acce8ab3a0ed0d66f2480ca',
      freelancerId: '6acce8ab3a0ed0d66f2480c7',
      amountCents: 2000,
      status: 'pending',
      createdAt: '2026-10-12T14:03:23.720Z',
    })
  })
})

describe('normalizeTransaction', () => {
  it('renames the API fields and ignores the pre-formatted amount', () => {
    const transaction = normalizeTransaction(rawTransaction)

    expect(transaction).toEqual({
      id: '6acce8ab3a0ed0d66f2480ee',
      bookingId: '6acce8ab3a0ed0d66f2480db',
      clientId: '6acce8ab3a0ed0d66f2480ca',
      freelancerId: '6acce8ab3a0ed0d66f2480c7',
      amountCents: 2000,
      status: 'succeeded',
      createdAt: '2026-10-12T14:03:23.841Z',
    })
    expect(transaction).not.toHaveProperty('amountFormatted')
  })

  it('copes with the short form used in the income summary', () => {
    const transaction = normalizeTransaction({
      _id: 't1',
      booking: 'b1',
      amountCents: 500,
      status: 'succeeded',
      createdAt: '2026-10-12T14:03:23.841Z',
    })

    expect(transaction.clientId).toBeNull()
    expect(transaction.freelancerId).toBeNull()
    expect(transaction.bookingId).toBe('b1')
  })
})

describe('normalizeIncome', () => {
  it('keeps the totals in cents and normalises every transaction', () => {
    const income = normalizeIncome({
      totalIncomeCents: 2000,
      totalIncomeFormatted: 'R20.00',
      completedPayments: 1,
      currency: 'ZAR',
      transactions: [
        { _id: 't1', booking: 'b1', amountCents: 2000, status: 'succeeded', createdAt: '2026-10-12T14:03:23.841Z' },
      ],
    })

    expect(income).toEqual({
      totalIncomeCents: 2000,
      completedPayments: 1,
      currency: 'ZAR',
      transactions: [
        {
          id: 't1',
          bookingId: 'b1',
          clientId: null,
          freelancerId: null,
          amountCents: 2000,
          status: 'succeeded',
          createdAt: '2026-10-12T14:03:23.841Z',
        },
      ],
    })
  })

  it('copes with a response that has no transactions list', () => {
    expect(normalizeIncome({ totalIncomeCents: 0, completedPayments: 0, currency: 'ZAR' }).transactions).toEqual([])
  })
})
