import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { OAuth } from './OAuth'
import { OAuthTokenStore } from './tokenStore'

// The OAuth constructor requires `window` to be defined (it is browser-only).
// Stub just enough of the browser global so we can instantiate OAuth in Node.
vi.stubGlobal('window', {
  localStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  sessionStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  crypto: { getRandomValues: vi.fn((arr: Uint8Array) => arr.fill(0)) },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
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

describe('OAuth message listener lifecycle', () => {
  beforeEach(() => {
    vi.mocked(window.addEventListener).mockClear()
    vi.mocked(window.removeEventListener).mockClear()
    vi.mocked(window.open).mockReturnValue({
      closed: false,
      close: vi.fn()
    } as unknown as Window)
    vi.mocked(window.localStorage.setItem).mockClear()
    vi.mocked(window.localStorage.getItem).mockReturnValue('csrf-token')
    vi.mocked(window.sessionStorage.setItem).mockClear()
    vi.mocked(window.sessionStorage.getItem).mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not attach a message listener in the constructor', () => {
    makeOAuth({ basePath: 'https://api.example.com' })
    expect(window.addEventListener).not.toHaveBeenCalled()
  })

  it('attaches a message listener when loginAsync starts (postMessage flow)', async () => {
    const oauth = makeOAuth({ basePath: 'https://api.example.com' })
    // Kick off a login — don't await so we can inspect immediately
    void oauth.loginAsync({ redirectUri: 'postMessage' })
    // Flush microtasks
    await Promise.resolve()
    expect(window.addEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
      false
    )
  })

  it('does not attach a duplicate listener on repeated loginAsync calls', async () => {
    const oauth = makeOAuth({ basePath: 'https://api.example.com' })
    void oauth.loginAsync({ redirectUri: 'postMessage' })
    await Promise.resolve()
    void oauth.loginAsync({ redirectUri: 'postMessage' })
    await Promise.resolve()
    // Should still only be registered once
    const messageAddCalls = vi
      .mocked(window.addEventListener)
      .mock.calls.filter(([event]) => event === 'message')
    expect(messageAddCalls).toHaveLength(1)
  })

  it('removes the message listener when the login settles', async () => {
    const oauth = makeOAuth({ basePath: 'https://api.example.com' })
    const loginPromise = oauth.loginAsync({ redirectUri: 'postMessage' })
    await Promise.resolve()

    // Retrieve the registered handler
    const addCall = vi
      .mocked(window.addEventListener)
      .mock.calls.find(([event]) => event === 'message')
    expect(addCall).toBeDefined()
    const registeredHandler = addCall![1]

    // Settle the login via an error path
    ;(oauth as any)._settleLogin(new Error('test settle'))

    // Await so rejection is handled
    await loginPromise.catch(() => {})

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'message',
      registeredHandler,
      false
    )
  })

  it('does not attach a listener when redirectUri is not postMessage', async () => {
    const oauth = makeOAuth({ basePath: 'https://api.example.com' })
    // When redirectUri is a real URL the code does window.location.href = …
    // and never enters the postMessage branch — don't await the never-settling promise
    void oauth.loginAsync({ redirectUri: 'https://myapp.example.com/callback' })
    await Promise.resolve()
    expect(window.addEventListener).not.toHaveBeenCalledWith(
      'message',
      expect.any(Function),
      false
    )
  })
})
