// These rules mirror what the backend enforces when a user registers
// (validateAuthInput.js and authController.js). They only exist to give users
// fast feedback - the API still validates everything itself and has the
// final say.

export const ROLES = ['client', 'freelancer']
export const PASSWORD_MIN = 12
export const PASSWORD_MAX = 72
export const NAME_MAX = 100
export const EMAIL_MAX = 254

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// The API accepts at most 72 bytes of UTF-8 for a password, so the limit is
// counted in bytes, not characters. Letters and digits are one byte each, but
// accented letters, symbols and emojis take two to four.
const byteLength = (text) => new TextEncoder().encode(text).length

export const validateLogin = ({ email, password }) => {
  const errors = {}

  if (!email.trim()) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Please enter a valid email address.'
  }

  if (!password) {
    errors.password = 'Password is required.'
  }

  return errors
}

export const validateRegister = ({ fullName, email, password, confirmPassword, role }) => {
  const errors = {}

  if (!fullName.trim()) {
    errors.fullName = 'Full name is required.'
  } else if (fullName.trim().length > NAME_MAX) {
    errors.fullName = `Full name must not exceed ${NAME_MAX} characters.`
  }

  if (!email.trim()) {
    errors.email = 'Email is required.'
  } else if (email.trim().length > EMAIL_MAX) {
    errors.email = `Email must not exceed ${EMAIL_MAX} characters.`
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Please enter a valid email address.'
  }

  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < PASSWORD_MIN) {
    errors.password = `Password must be at least ${PASSWORD_MIN} characters.`
  } else if (byteLength(password) > PASSWORD_MAX) {
    errors.password = `Password is too long. The limit is ${PASSWORD_MAX} bytes, and accented letters, symbols and emojis use more than one.`
  }

  if (password && confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  if (!ROLES.includes(role)) {
    errors.role = 'Please choose Client or Freelancer.'
  }

  return errors
}

export const hasErrors = (errors) => Object.keys(errors).length > 0
