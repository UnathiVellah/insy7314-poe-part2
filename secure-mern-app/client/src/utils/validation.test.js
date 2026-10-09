import { describe, expect, it } from 'vitest'
import { hasErrors, validateLogin, validateRegister } from './validation'

const validRegistration = {
  fullName: 'Thandi Nkosi',
  email: 'thandi@example.com',
  password: 'Passw0rd!123',
  confirmPassword: 'Passw0rd!123',
  role: 'freelancer',
}

describe('validateLogin', () => {
  it('accepts a valid email and a password', () => {
    expect(hasErrors(validateLogin({ email: 'a@b.co', password: 'x' }))).toBe(false)
  })

  it('requires both fields', () => {
    const errors = validateLogin({ email: '  ', password: '' })
    expect(errors.email).toBeDefined()
    expect(errors.password).toBeDefined()
  })

  it('rejects a malformed email', () => {
    expect(validateLogin({ email: 'not-an-email', password: 'x' }).email).toMatch(/valid email/i)
  })
})

describe('validateRegister', () => {
  it('accepts a complete, valid registration', () => {
    expect(hasErrors(validateRegister(validRegistration))).toBe(false)
  })

  it('rejects a password shorter than 8 characters', () => {
    const errors = validateRegister({ ...validRegistration, password: 'short', confirmPassword: 'short' })
    expect(errors.password).toMatch(/between 8 and 72/i)
  })

  it('rejects a password longer than 72 characters', () => {
    const long = 'a'.repeat(73)
    const errors = validateRegister({ ...validRegistration, password: long, confirmPassword: long })
    expect(errors.password).toBeDefined()
  })

  it('rejects mismatched passwords', () => {
    const errors = validateRegister({ ...validRegistration, confirmPassword: 'Different123' })
    expect(errors.confirmPassword).toMatch(/do not match/i)
  })

  it('only allows the client and freelancer roles', () => {
    expect(validateRegister({ ...validRegistration, role: 'admin' }).role).toBeDefined()
    expect(validateRegister({ ...validRegistration, role: '' }).role).toBeDefined()
  })

  it('requires a full name', () => {
    expect(validateRegister({ ...validRegistration, fullName: '   ' }).fullName).toBeDefined()
  })
})