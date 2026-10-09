import { apiRequest } from './api'

/**
 * POST /api/auth/login
 * Resolves with { token, user }.
 */
export const login = async (email, password) => {
  const body = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return body.data
}

/**
 * POST /api/auth/register
 * `role` must be 'client' or 'freelancer'. Resolves with the created user
 * (the API never returns a password or hash).
 */
export const register = async ({ fullName, email, password, role }) => {
  const body = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ fullName, email, password, role }),
  })
  return body.data
}

/**
 * GET /api/auth/me
 * Asks the server who the current token belongs to.
 */
export const getCurrentUser = async () => {
  const body = await apiRequest('/api/auth/me')
  return body.data
}