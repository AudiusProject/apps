import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { OAuth } from '../oauth/OAuth'

import { addTokenRefreshMiddleware } from './addTokenRefreshMiddleware'

// Minimal fetch mock helper
function mockResponse(status: number, body?: object): Response {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function createMockOAuth(
  refreshBehaviour: () => Promise<string | null>,
  hasRefreshToken = true
): OAuth {
  return {
    hasRefreshToken: async () => hasRefreshToken,
    refreshAccessToken: refreshBehaviour
  } as unknown as OAuth
}

describe('addTokenRefreshMiddleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('passes through non-401 responses unchanged', async () => {
    const oauth = createMockOAuth(async () => 'token')
    const mw = addTokenRefreshMiddleware({ oauth })
    const response = mockResponse(200, { data: 'ok' })

    const result = await mw.post!({
      fetch,
      url: 'https://api.example.com/v1/users/me',
      init: {},
      response
    })

    expect(result).toBe(response)
  })

  it('passes through 401 without calling refreshAccessToken when unauthenticated', async () => {
    const refreshFn = vi.fn()
    const oauth = createMockOAuth(refreshFn, false)
    const mw = addTokenRefreshMiddleware({ oauth })
    const response = mockResponse(401)

    const result = await mw.post!({
      fetch,
      url: 'https://api.example.com/v1/users/me',
      init: {},
      response
    })

    expect(result).toBe(response)
    expect(refreshFn).not.toHaveBeenCalled()
  })

  it('passes through 401 when refresh returns null (no refresh token)', async () => {
    const oauth = createMockOAuth(async () => null)
    const mw = addTokenRefreshMiddleware({ oauth })
    const response = mockResponse(401)

    const result = await mw.post!({
      fetch,
      url: 'https://api.example.com/v1/users/me',
      init: {},
      response
    })

    expect(result).toBe(response)
  })

  it.skip('refreshes and retries on 401 when refresh succeeds', async () => {
    const oauth = createMockOAuth(async () => 'new-access')
    const retryResponse = mockResponse(200, { data: 'success' })
    const contextFetch = vi.fn().mockResolvedValueOnce(retryResponse)

    const mw = addTokenRefreshMiddleware({ oauth })

    const result = await mw.post!({
      fetch: contextFetch,
      url: 'https://api.example.com/v1/tracks/123',
      init: {
        method: 'GET',
        headers: { Authorization: 'Bearer expired-access' }
      },
      response: mockResponse(401)
    })

    // Original request was retried with new token
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
    const oauth = createMockOAuth(async () => null)
    const mw = addTokenRefreshMiddleware({ oauth })
    const original401 = mockResponse(401)

    const result = await mw.post!({
      fetch,
      url: 'https://api.example.com/v1/tracks/123',
      init: {},
      response: original401
    })

    expect(result).toBe(original401)
  })

  it('surfaces 401 when refreshAccessToken throws', async () => {
    const oauth = createMockOAuth(async () => {
      throw new Error('network failure')
    })
    const mw = addTokenRefreshMiddleware({ oauth })
    const original401 = mockResponse(401)

    const result = await mw.post!({
      fetch,
      url: 'https://api.example.com/v1/tracks/123',
      init: {},
      response: original401
    })

    expect(result).toBe(original401)
  })
})
