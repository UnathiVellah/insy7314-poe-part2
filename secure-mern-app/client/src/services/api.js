const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:4000'

/**
 * Error thrown for any failed API call. `status` is the HTTP status code
 * (0 when the server could not be reached at all).
 */
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const getToken = () => sessionStorage.getItem('token')

export const saveAuth = (token, user) => {
  sessionStorage.setItem('token', token)
  sessionStorage.setItem('user', JSON.stringify(user))
}

export const clearAuth = () => {
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
}

export const getSavedUser = () => {
  try {
    const user = sessionStorage.getItem('user')
    return user ? JSON.parse(user) : null
  } catch {
    return null
  }
}

/**
 * Wrapper around fetch that:
 *  - prefixes the API base URL
 *  - attaches the JWT as a Bearer token when one is stored
 *  - turns failures into ApiError with a safe, user-friendly message
 */
export const apiRequest = async (path, options = {}) => {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    // Network failure / server down / untrusted certificate.
    // Deliberately generic - never surface raw browser error details.
    throw new ApiError('Unable to reach the server. Please try again later.', 0)
  }

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    const fallback =
      response.status === 429
        ? 'Too many requests. Please wait a moment and try again.'
        : 'Something went wrong. Please try again.'
    throw new ApiError(body.error || fallback, response.status)
  }

  return body
}