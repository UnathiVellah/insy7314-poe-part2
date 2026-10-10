import { describe, expect, it } from 'vitest'
import { formatDate, formatPrice } from './format'

describe('formatPrice', () => {
  it('formats an amount in rand', () => {
    expect(formatPrice(500)).toMatch(/R\s?500/)
  })

  it('keeps cents for fractional amounts', () => {
    expect(formatPrice(1234.5)).toMatch(/1\D?234[.,]50/)
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
