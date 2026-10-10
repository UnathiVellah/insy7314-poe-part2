import { describe, expect, it } from 'vitest'
import { hasErrors, validateGigForm } from './gigValidation'

const valid = { title: 'Logo design', description: 'Three concepts and one revision', price: '500' }

describe('validateGigForm', () => {
  it('accepts a complete, valid gig', () => {
    expect(hasErrors(validateGigForm(valid))).toBe(false)
  })

  it('requires a title and a description', () => {
    const errors = validateGigForm({ ...valid, title: '   ', description: '' })
    expect(errors.title).toBeDefined()
    expect(errors.description).toBeDefined()
  })

  it('rejects a title or description that is too long', () => {
    expect(validateGigForm({ ...valid, title: 'a'.repeat(101) }).title).toMatch(/100/)
    expect(validateGigForm({ ...valid, description: 'a'.repeat(1001) }).description).toMatch(/1000/)
  })

  it('requires a price', () => {
    expect(validateGigForm({ ...valid, price: '' }).price).toMatch(/required/i)
    expect(validateGigForm({ ...valid, price: '   ' }).price).toMatch(/required/i)
  })

  it('rejects prices that are not a positive number', () => {
    expect(validateGigForm({ ...valid, price: 'abc' }).price).toBeDefined()
    expect(validateGigForm({ ...valid, price: '0' }).price).toBeDefined()
    expect(validateGigForm({ ...valid, price: '-50' }).price).toBeDefined()
    expect(validateGigForm({ ...valid, price: 'Infinity' }).price).toBeDefined()
  })

  it('rejects a price above the maximum', () => {
    expect(validateGigForm({ ...valid, price: '1000001' }).price).toMatch(/must not exceed/i)
    expect(hasErrors(validateGigForm({ ...valid, price: '1000000' }))).toBe(false)
  })

  it('allows cents but no more than two decimal places', () => {
    expect(hasErrors(validateGigForm({ ...valid, price: '19.99' }))).toBe(false)
    expect(validateGigForm({ ...valid, price: '19.999' }).price).toMatch(/2 decimal/i)
  })

  it('accepts a price that is already a number', () => {
    expect(hasErrors(validateGigForm({ ...valid, price: 750 }))).toBe(false)
  })
})
