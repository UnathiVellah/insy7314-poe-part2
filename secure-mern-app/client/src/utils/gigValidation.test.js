import { describe, expect, it } from 'vitest'
import { hasErrors, validateGigForm } from './gigValidation'

const valid = {
  title: 'Logo design',
  description: 'Three concepts and one revision round',
  category: 'Design',
  price: '500',
}

describe('validateGigForm', () => {
  it('accepts a complete, valid gig', () => {
    expect(hasErrors(validateGigForm(valid))).toBe(false)
  })

  it('requires a title and a description', () => {
    const errors = validateGigForm({ ...valid, title: '   ', description: '' })
    expect(errors.title).toMatch(/required/i)
    expect(errors.description).toMatch(/required/i)
  })

  it('requires a category', () => {
    expect(validateGigForm({ ...valid, category: '   ' }).category).toBeDefined()
  })

  it('rejects a title or description that is too short, like the API does', () => {
    expect(validateGigForm({ ...valid, title: 'Logo' }).title).toMatch(/at least 5/)
    expect(validateGigForm({ ...valid, description: 'Too short' }).description).toMatch(/at least 20/)
    expect(hasErrors(validateGigForm({ ...valid, title: 'Logos', description: 'a'.repeat(20) }))).toBe(false)
  })

  it('counts length after trimming spaces', () => {
    expect(validateGigForm({ ...valid, title: '  Logo  ' }).title).toMatch(/at least 5/)
  })

  it('rejects a title, description or category that is too long', () => {
    expect(validateGigForm({ ...valid, title: 'a'.repeat(101) }).title).toMatch(/100/)
    expect(validateGigForm({ ...valid, description: 'a'.repeat(2001) }).description).toMatch(/2000/)
    expect(hasErrors(validateGigForm({ ...valid, description: 'a'.repeat(2000) }))).toBe(false)
    expect(validateGigForm({ ...valid, category: 'a'.repeat(51) }).category).toMatch(/50/)
  })

  it('requires a price', () => {
    expect(validateGigForm({ ...valid, price: '' }).price).toMatch(/required/i)
    expect(validateGigForm({ ...valid, price: '   ' }).price).toMatch(/required/i)
  })

  it('rejects prices that are not a number of at least 1', () => {
    expect(validateGigForm({ ...valid, price: 'abc' }).price).toBeDefined()
    expect(validateGigForm({ ...valid, price: '0' }).price).toMatch(/at least 1/)
    expect(validateGigForm({ ...valid, price: '0.5' }).price).toMatch(/at least 1/)
    expect(validateGigForm({ ...valid, price: '-50' }).price).toBeDefined()
    expect(validateGigForm({ ...valid, price: 'Infinity' }).price).toBeDefined()
    expect(hasErrors(validateGigForm({ ...valid, price: '1' }))).toBe(false)
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
