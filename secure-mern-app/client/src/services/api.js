import { handleMockRequest } from '../mocks/mockServer'

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:4000'

// With VITE_USE_MOCKS=true, requests for these resources are answered by the
// fake server in src/mocks instead of the network. Login, registration and the
// profile check always go to the real API.
const MOCKED_PREFIXES = ['/api/gigs', '/api/bookings', '/api/transactions']

const mocksEnabled = () => import.meta.env.VITE_USE_MOCKS === 'true'

const isMocked = (path) =>
  mocksEnabled() &&
  MOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`))

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

// Returns the body of a successful response, or throws an ApiError with a
// safe, user-friendly message for a failed one.
const unwrap = (status, body) => {
  if (status >= 400) {
    const fallback =
      status === 429
        ? 'Too many requests. Please wait a moment and try again.'
        : 'Something went wrong. Please try again.'
    throw new ApiError(body.error || fallback, status)
  }

  return body
}

/**
 * Wrapper around fetch that:
 *  - prefixes the API base URL
 *  - attaches the JWT as a Bearer token when one is stored
 *  - turns failures into ApiError with a safe, user-friendly message
 *  - hands marketplace requests to the fake server when mock mode is on
 */
export const apiRequest = async (path, options = {}) => {
  const token = getToken()

  if (isMocked(path)) {
    let body
    try {
      body = options.body ? JSON.parse(options.body) : undefined
    } catch {
      body = undefined
    }

    const result = handleMockRequest({
      method: options.method || 'GET',
      path,
      body,
      user: token ? getSavedUser() : null,
    })

    return unwrap(result.status, result.body)
  }

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

  return unwrap(response.status, body)
}
