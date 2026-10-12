import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetMockStore } from '../mocks/mockStore'
import { ApiError, apiRequest, clearAuth, saveAuth } from './api'

const mockFetch = (status, body) => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

describe('apiRequest', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the parsed JSON body on success', async () => {
    mockFetch(200, { status: 'OK' })
    await expect(apiRequest('/health')).resolves.toEqual({ status: 'OK' })
  })

  it('attaches the Bearer token when the user is logged in', async () => {
    saveAuth('abc123', { id: 'u1', role: 'client' })
    mockFetch(200, {})

    await apiRequest('/api/auth/me')

    const [, options] = globalThis.fetch.mock.calls[0]
    expect(options.headers.Authorization).toBe('Bearer abc123')
  })

  it('does not send an Authorization header after logout', async () => {
    saveAuth('abc123', { id: 'u1', role: 'client' })
    clearAuth()
    mockFetch(200, {})

    await apiRequest('/health')

    const [, options] = globalThis.fetch.mock.calls[0]
    expect(options.headers.Authorization).toBeUndefined()
  })

  it('throws an ApiError carrying the backend error message', async () => {
    mockFetch(401, { error: 'Invalid email or password' })

    await expect(apiRequest('/api/auth/login')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Invalid email or password',
    })
  })

  it('shows a friendly rate-limit message on 429 without a body', async () => {
    mockFetch(429, {})

    await expect(apiRequest('/api/auth/login')).rejects.toThrow(/too many requests/i)
  })

  it('hides raw network errors behind a generic message', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    const error = await apiRequest('/health').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
    expect(error.message).toBe('Unable to reach the server. Please try again later.')
  })
})

describe('apiRequest with built-in fake data switched on', () => {
  const freelancer = { id: '65f0000000000000000000f1', fullName: 'Thandi', email: 't@example.com', role: 'freelancer' }

  beforeEach(() => {
    sessionStorage.clear()
    resetMockStore()
    vi.stubEnv('VITE_USE_MOCKS', 'true')
    mockFetch(200, { status: 'OK' })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('answers gig, booking and transaction requests without the network', async () => {
    saveAuth('jwt-token', freelancer)

    const gigs = await apiRequest('/api/gigs?page=1&limit=2')
    await apiRequest('/api/bookings/freelancer')
    await apiRequest('/api/transactions/income')

    expect(gigs.data).toHaveLength(2)
    expect(gigs.pagination.limit).toBe(2)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('sends the request body to the fake server', async () => {
    saveAuth('jwt-token', freelancer)

    const created = await apiRequest('/api/gigs', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Brand identity pack',
        description: 'Logo, colour palette and font pairing.',
        category: 'Design',
        price: 900,
      }),
    })

    expect(created.data.freelancer).toBe(freelancer.id)
  })

  it('turns refusals from the fake server into ApiErrors, like the real thing', async () => {
    saveAuth('jwt-token', { ...freelancer, role: 'client' })

    await expect(apiRequest('/api/gigs/mine')).rejects.toMatchObject({ status: 403 })
  })

  it('refuses a request with no one logged in', async () => {
    await expect(apiRequest('/api/bookings/mine')).rejects.toMatchObject({
      status: 401,
      message: 'Authentication token required',
    })
  })

  it('still sends login and profile requests to the real API', async () => {
    await apiRequest('/api/auth/me')

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('does not mistake a similar-looking path for a marketplace one', async () => {
    await apiRequest('/api/gigsfoo')

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('goes to the real API when the switch is off', async () => {
    vi.stubEnv('VITE_USE_MOCKS', 'false')

    await apiRequest('/api/gigs')

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })
})
