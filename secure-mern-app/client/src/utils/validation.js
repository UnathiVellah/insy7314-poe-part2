// These rules mirror the backend (validateAuthInput.js). They only exist to
// give users fast feedback - the API still validates everything itself.

export const ROLES = ['client', 'freelancer']
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

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
  } else if (fullName.trim().length > 80) {
    errors.fullName = 'Full name must not exceed 80 characters.'
  }

  if (!email.trim()) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Please enter a valid email address.'
  }

  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    errors.password = `Password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`
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