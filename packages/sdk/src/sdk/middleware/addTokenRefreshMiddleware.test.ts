import { describe, it, expect, vi, beforeEach } from 'vitest'

import { OAuthTokenStore } from '../oauth/tokenStore'

import { addTokenRefreshMiddleware } from './addTokenRefreshMiddleware'

// Mock cross-fetch used by the middleware
vi.mock('cross-fetch', () => ({
  default: vi.fn()
}))

import crossFetch from 'cross-fetch'
const mockCrossFetch = vi.mocked(crossFetch)

// Minimal fetch mock helper
function mockResponse(status: number, body?: object): Response {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

describe('addTokenRefreshMiddleware', () => {
  let tokenStore: OAuthTokenStore
  const apiKey = 'test-api-key'
  const basePath = 'https://api.example.com/v1'

  beforeEach(() => {
    tokenStore = new OAuthTokenStore()
    vi.restoreAllMocks()
  })

  it('passes through non-401 responses unchanged', async () => {
    const mw = addTokenRefreshMiddleware({ tokenStore, apiKey, basePath })
    const response = mockResponse(200, { data: 'ok' })

    const result = await mw.post!({
      fetch,
      url: 'https://api.example.com/v1/users/me',
      init: {},
      response
    })

    expect(result).toBe(response)
  })

  it('passes through 401 when no refresh token is available', async () => {
    const mw = addTokenRefreshMiddleware({ tokenStore, apiKey, basePath })
    const response = mockResponse(401)

    const result = await mw.post!({
      fetch,
      url: 'https://api.example.com/v1/users/me',
      init: {},
      response
    })

    expect(result).toBe(response)
  })

  it('refreshes and retries on 401 when refresh token exists', async () => {
    tokenStore.setTokens('expired-access', 'valid-refresh')

    const refreshResponse = mockResponse(200, {
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'write'
    })

    const retryResponse = mockResponse(200, { data: 'success' })

    // Mock cross-fetch for the refresh call
    mockCrossFetch.mockResolvedValueOnce(refreshResponse)

    // The retry fetch provided in context
    const contextFetch = vi.fn().mockResolvedValueOnce(retryResponse)

    const mw = addTokenRefreshMiddleware({ tokenStore, apiKey, basePath })

    const result = await mw.post!({
      fetch: contextFetch,
      url: 'https://api.example.com/v1/tracks/123',
      init: {
        method: 'GET',
        headers: { Authorization: 'Bearer expired-access' }
      },
      response: mockResponse(401)
    })

    // Refresh endpoint was called
    expect(mockCrossFetch).toHaveBeenCalledWith(
      `${basePath}/oauth/token`,
      expect.objectContaining({
        method: 'POST'
      })
    )

    // Token store was updated
    expect(tokenStore.accessToken).toBe('new-access')
    expect(tokenStore.refreshToken).toBe('new-refresh')

    // Original request was retried
    expect(contextFetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/tracks/123',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer new-access'
        })
      })
    )

    expect(result).toBe(retryResponse)
  })

  it('surfaces 401 when refresh fails', async () => {
    tokenStore.setTokens('expired-access', 'revoked-refresh')

    // Refresh returns 400 (invalid_grant)
    mockCrossFetch.mockResolvedValueOnce(mockResponse(400))

    const mw = addTokenRefreshMiddleware({ tokenStore, apiKey, basePath })
    const original401 = mockResponse(401)

    const result = await mw.post!({
      fetch,
      url: 'https://api.example.com/v1/tracks/123',
      init: {},
      response: original401
    })

    // Returns the original 401 — doesn't swallow it
    expect(result).toBe(original401)
  })

  it('surfaces 401 when refresh endpoint returns invalid JSON', async () => {
    tokenStore.setTokens('expired-access', 'valid-refresh')

    // Return 200 but with garbage body
    mockCrossFetch.mockResolvedValueOnce(
      new Response('not json', { status: 200 })
    )

    const mw = addTokenRefreshMiddleware({ tokenStore, apiKey, basePath })
    const original401 = mockResponse(401)

    const result = await mw.post!({
      fetch,
      url: 'https://api.example.com/v1/tracks/123',
      init: {},
      response: original401
    })

    expect(result).toBe(original401)
  })

  it('surfaces 401 when refresh response is missing required fields', async () => {
    tokenStore.setTokens('expired-access', 'valid-refresh')

    // Return 200 but only access_token (no refresh_token)
    mockCrossFetch.mockResolvedValueOnce(
      mockResponse(200, { access_token: 'new-access' })
    )

    const mw = addTokenRefreshMiddleware({ tokenStore, apiKey, basePath })
    const original401 = mockResponse(401)

    const result = await mw.post!({
      fetch,
      url: 'https://api.example.com/v1/tracks/123',
      init: {},
      response: original401
    })

    expect(result).toBe(original401)
  })

  it('surfaces 401 when network error occurs during refresh', async () => {
    tokenStore.setTokens('expired-access', 'valid-refresh')

    mockCrossFetch.mockRejectedValueOnce(new Error('network failure'))

    const mw = addTokenRefreshMiddleware({ tokenStore, apiKey, basePath })
    const original401 = mockResponse(401)

    const result = await mw.post!({
      fetch,
      url: 'https://api.example.com/v1/tracks/123',
      init: {},
      response: original401
    })

    expect(result).toBe(original401)
  })

  it('surfaces 401 when refresh token is cleared between check and exchange', async () => {
    tokenStore.setTokens('expired-access', 'about-to-be-cleared')

    // Simulate: refresh token exists at guard check, but the exchange returns
    // empty strings (server rejected it). The middleware should not store empty tokens.
    mockCrossFetch.mockResolvedValueOnce(
      mockResponse(200, { access_token: '', refresh_token: '' })
    )

    const mw = addTokenRefreshMiddleware({ tokenStore, apiKey, basePath })
    const original401 = mockResponse(401)

    const result = await mw.post!({
      fetch,
      url: 'https://api.example.com/v1/tracks/123',
      init: {},
      response: original401
    })

    // Empty tokens are rejected by the validation
    expect(result).toBe(original401)
  })
})
