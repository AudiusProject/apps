import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { OAuth } from './OAuth'
import { OAuthTokenStore } from './tokenStore'

// The OAuth constructor requires `window` to be defined (it is browser-only).
// Stub just enough of the browser global so we can instantiate OAuth in Node.
vi.stubGlobal('window', {
  localStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  sessionStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  addEventListener: vi.fn(),
  location: { href: '', origin: 'https://example.com' },
  open: vi.fn()
})

function makeOAuth(
  overrides: {
    apiKey?: string | null
    basePath?: string
    tokenStore?: OAuthTokenStore
  } = {}
): OAuth {
  const { apiKey = 'test-api-key', basePath, tokenStore } = overrides
  return new OAuth({
    ...(apiKey !== null ? { apiKey } : {}),
    ...(basePath !== undefined ? { basePath } : {}),
    ...(tokenStore !== undefined ? { tokenStore } : {})
  })
}

describe('OAuth.refreshAccessToken', () => {
  let tokenStore: OAuthTokenStore
  let oauth: OAuth

  beforeEach(() => {
    tokenStore = new OAuthTokenStore()
    tokenStore.setTokens('old-access', 'old-refresh')
    oauth = makeOAuth({
      basePath: 'https://api.example.com',
      tokenStore
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('success path: updates token store and returns new access token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'new-access',
            refresh_token: 'new-refresh'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    )

    const result = await oauth.refreshAccessToken()

    expect(result).toBe('new-access')
    expect(tokenStore.accessToken).toBe('new-access')
    expect(tokenStore.refreshToken).toBe('new-refresh')
  })

  it('sends the correct request body', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'new-access',
          refresh_token: 'new-refresh'
        }),
        { status: 200 }
      )
    )
    vi.stubGlobal('fetch', fetchSpy)

    await oauth.refreshAccessToken()

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/oauth/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: 'old-refresh',
          client_id: 'test-api-key'
        })
      })
    )
  })

  it('returns null and does not update store when response is not OK', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 }))
    )

    const result = await oauth.refreshAccessToken()

    expect(result).toBeNull()
    // Token store must remain unchanged
    expect(tokenStore.accessToken).toBe('old-access')
    expect(tokenStore.refreshToken).toBe('old-refresh')
  })

  it('returns null when response body is invalid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response('not-json', {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    )

    const result = await oauth.refreshAccessToken()

    expect(result).toBeNull()
  })

  it('returns null when access_token is missing from response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ refresh_token: 'new-refresh' }), {
          status: 200
        })
      )
    )

    const result = await oauth.refreshAccessToken()

    expect(result).toBeNull()
    expect(tokenStore.accessToken).toBe('old-access')
  })

  it('returns null when refresh_token is missing from response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'new-access' }), {
          status: 200
        })
      )
    )

    const result = await oauth.refreshAccessToken()

    expect(result).toBeNull()
    expect(tokenStore.refreshToken).toBe('old-refresh')
  })

  it('returns null when neither token field is present in response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'invalid_grant' }), {
          status: 200
        })
      )
    )

    const result = await oauth.refreshAccessToken()

    expect(result).toBeNull()
  })

  it('returns null when tokenStore is not configured', async () => {
    const oauthNoStore = makeOAuth({ basePath: 'https://api.example.com' })

    const result = await oauthNoStore.refreshAccessToken()

    expect(result).toBeNull()
  })

  it('returns null when basePath is not configured', async () => {
    const oauthNoBase = makeOAuth({ tokenStore })

    const result = await oauthNoBase.refreshAccessToken()

    expect(result).toBeNull()
  })

  it('returns null when there is no refresh token stored', async () => {
    tokenStore.clear()

    const result = await oauth.refreshAccessToken()

    expect(result).toBeNull()
  })

  it('returns null when fetch throws a network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValueOnce(new Error('network error'))
    )

    const result = await oauth.refreshAccessToken()

    expect(result).toBeNull()
  })
})
