import { describe, expect, it } from 'vitest'
import { hasErrors, validateLogin, validateRegister } from './validation'

const validRegistration = {
  fullName: 'Thandi Nkosi',
  email: 'thandi@example.com',
  password: 'Passw0rd!123',
  confirmPassword: 'Passw0rd!123',
  role: 'freelancer',
}

const withPassword = (password) => ({ ...validRegistration, password, confirmPassword: password })

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
    expect(validateLogin({ email: 'a@@b.co', password: 'x' }).email).toMatch(/valid email/i)
  })

  it('does not apply the registration password rules to a login', () => {
    expect(hasErrors(validateLogin({ email: 'a@b.co', password: 'short' }))).toBe(false)
  })
})

describe('validateRegister', () => {
  it('accepts a complete, valid registration', () => {
    expect(hasErrors(validateRegister(validRegistration))).toBe(false)
  })

  describe('password', () => {
    it('rejects a password shorter than 12 characters', () => {
      expect(validateRegister(withPassword('short')).password).toMatch(/at least 12/i)
      expect(validateRegister(withPassword('Passw0rd!12')).password).toMatch(/at least 12/i)
    })

    it('accepts a password of exactly 12 characters', () => {
      expect(hasErrors(validateRegister(withPassword('Passw0rd!123')))).toBe(false)
    })

    it('rejects a password longer than 72 characters and accepts exactly 72', () => {
      expect(validateRegister(withPassword('a'.repeat(73))).password).toMatch(/too long/i)
      expect(hasErrors(validateRegister(withPassword('a'.repeat(72))))).toBe(false)
    })

    it('counts the 72 limit in bytes, as the API does, not in characters', () => {
      // "e with an accent" is 1 character but 2 bytes in UTF-8.
      expect(hasErrors(validateRegister(withPassword('é'.repeat(36))))).toBe(false)
      expect(validateRegister(withPassword('é'.repeat(37))).password).toMatch(/too long/i)
    })

    it('rejects mismatched passwords', () => {
      const errors = validateRegister({ ...validRegistration, confirmPassword: 'Different1234' })
      expect(errors.confirmPassword).toMatch(/do not match/i)
    })
  })

  describe('name and email', () => {
    it('requires a full name', () => {
      expect(validateRegister({ ...validRegistration, fullName: '   ' }).fullName).toBeDefined()
    })

    it('allows a name of 100 characters but not 101', () => {
      expect(hasErrors(validateRegister({ ...validRegistration, fullName: 'a'.repeat(100) }))).toBe(false)
      expect(validateRegister({ ...validRegistration, fullName: 'a'.repeat(101) }).fullName).toMatch(/100/)
    })

    it('allows an email of 254 characters but not 255', () => {
      const longest = `${'a'.repeat(242)}@example.com`
      expect(longest).toHaveLength(254)

      expect(hasErrors(validateRegister({ ...validRegistration, email: longest }))).toBe(false)
      expect(validateRegister({ ...validRegistration, email: `a${longest}` }).email).toMatch(/254/)
    })

    it('rejects an email with spaces or more than one @', () => {
      expect(validateRegister({ ...validRegistration, email: 'a b@c.co' }).email).toBeDefined()
      expect(validateRegister({ ...validRegistration, email: 'a@@c.co' }).email).toBeDefined()
    })
  })

  it('only allows the client and freelancer roles', () => {
    expect(validateRegister({ ...validRegistration, role: 'admin' }).role).toBeDefined()
    expect(validateRegister({ ...validRegistration, role: '' }).role).toBeDefined()
  })
})
