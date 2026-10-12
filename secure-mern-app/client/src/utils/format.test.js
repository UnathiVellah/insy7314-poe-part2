import { describe, expect, it } from 'vitest'
import { formatCents, formatDate, formatPrice } from './format'

describe('formatPrice', () => {
  it('formats an amount in rand', () => {
    expect(formatPrice(500)).toMatch(/R\s?500/)
  })

  it('keeps cents for fractional amounts', () => {
    expect(formatPrice(1234.5)).toMatch(/1\D?234[.,]50/)
  })
})

describe('formatCents', () => {
  it('turns whole cents into rand', () => {
    expect(formatCents(2000)).toMatch(/R\s?20[.,]00/)
    expect(formatCents(123456)).toMatch(/1\D?234[.,]56/)
  })

  it('shows cents exactly, without floating point surprises', () => {
    expect(formatCents(1999)).toMatch(/19[.,]99/)
    expect(formatCents(435)).toMatch(/4[.,]35/)
    expect(formatCents(0)).toMatch(/R\s?0[.,]00/)
  })
})

describe('formatDate', () => {
  it('formats an ISO timestamp as a readable date', () => {
    const text = formatDate('2026-09-20T10:00:00.000Z')
    expect(text).toMatch(/20/)
    expect(text).toMatch(/2026/)
  })

  it('returns an empty string for a missing or invalid date', () => {
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('not-a-date')).toBe('')
  })
})
