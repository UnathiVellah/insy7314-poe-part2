import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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