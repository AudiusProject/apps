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
    oauth.loginAsync({ redirectUri: 'postMessage' })
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
    oauth.loginAsync({ redirectUri: 'postMessage' })
    await Promise.resolve()
    oauth.loginAsync({ redirectUri: 'postMessage' })
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

  it('does not attach a listener when display is fullScreen', async () => {
    const oauth = makeOAuth({ basePath: 'https://api.example.com' })
    // When display is fullScreen the code does window.location.href = …
    // and never enters the popup branch
    oauth.loginAsync({
      redirectUri: 'https://myapp.example.com/callback',
      display: 'fullScreen'
    })
    await Promise.resolve()
    expect(window.addEventListener).not.toHaveBeenCalledWith(
      'message',
      expect.any(Function),
      false
    )
  })

  it('attaches a message listener for popup even with a real redirectUri', async () => {
    const oauth = makeOAuth({ basePath: 'https://api.example.com' })
    oauth.loginAsync({
      redirectUri: 'https://myapp.example.com/callback',
      display: 'popup'
    })
    await Promise.resolve()
    expect(window.addEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
      false
    )
  })
})

describe('OAuth._exchangeCodeForTokens (via getRedirectResult)', () => {
  let tokenStore: OAuthTokenStore

  const mockProfile = {
    userId: 1,
    email: 'test@example.com',
    name: 'Test User',
    handle: 'testuser',
    verified: false,
    profilePicture: null,
    apiKey: 'test-api-key',
    sub: 1,
    iat: '2026-01-01'
  }

  beforeEach(() => {
    tokenStore = new OAuthTokenStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function setLocationWithCode(code: string, state: string) {
    Object.defineProperty(window, 'location', {
      value: {
        href: `https://example.com/callback?code=${code}&state=${state}`,
        origin: 'https://example.com',
        search: `?code=${code}&state=${state}`,
        hash: ''
      },
      writable: true
    })
  }

  function resetLocation() {
    Object.defineProperty(window, 'location', {
      value: { href: '', origin: 'https://example.com', search: '', hash: '' },
      writable: true
    })
  }

  it('exchanges code for tokens and returns LoginResult', async () => {
    vi.mocked(window.sessionStorage.getItem).mockImplementation(
      (key: string) => {
        if (key === 'audiusOauthState') return 'test-state'
        if (key === 'audiusPkceCodeVerifier') return 'test-verifier'
        if (key === 'audiusPkceRedirectUri')
          return 'https://example.com/callback'
        return null
      }
    )
    setLocationWithCode('auth-code-123', 'test-state')
    ;(window as any).history = { replaceState: vi.fn() }

    const fetchMock = vi.fn()
    // First call: /oauth/token
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'access-123',
          refresh_token: 'refresh-123'
        }),
        { status: 200 }
      )
    )
    // Second call: /oauth/me
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(mockProfile), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const oauth = new OAuth({
      apiKey: 'test-api-key',
      basePath: 'https://api.example.com',
      tokenStore
    })

    expect(oauth.hasRedirectResult).toBe(true)
    const result = await oauth.getRedirectResult()

    expect(result).not.toBeNull()
    expect(result!.profile.handle).toBe('testuser')
    expect(result!.encodedJwt).toBe('access-123')
    expect(tokenStore.accessToken).toBe('access-123')
    expect(tokenStore.refreshToken).toBe('refresh-123')

    // Verify correct POST body for token exchange
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/oauth/token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: 'auth-code-123',
          code_verifier: 'test-verifier',
          client_id: 'test-api-key',
          redirect_uri: 'https://example.com/callback'
        })
      })
    )

    // Second call returns null (consumed)
    expect(oauth.hasRedirectResult).toBe(false)
    expect(await oauth.getRedirectResult()).toBeNull()

    resetLocation()
  })

  it('returns null when no code/state in URL', async () => {
    resetLocation()
    const oauth = makeOAuth({
      basePath: 'https://api.example.com',
      tokenStore
    })
    expect(oauth.hasRedirectResult).toBe(false)
    expect(await oauth.getRedirectResult()).toBeNull()
  })

  it('returns null when code verifier is missing from sessionStorage', async () => {
    vi.mocked(window.sessionStorage.getItem).mockReturnValue(null)
    setLocationWithCode('auth-code-123', 'test-state')
    ;(window as any).history = { replaceState: vi.fn() }

    const oauth = new OAuth({
      apiKey: 'test-api-key',
      basePath: 'https://api.example.com',
      tokenStore
    })
    // URL has code+state, so hasRedirectResult is true before detection
    expect(oauth.hasRedirectResult).toBe(true)
    // But getRedirectResult returns null because verifier is missing
    expect(await oauth.getRedirectResult()).toBeNull()
    // After detection, hasRedirectResult reflects consumed state
    expect(oauth.hasRedirectResult).toBe(false)

    resetLocation()
  })

  it('does not exchange when state does not match', async () => {
    vi.mocked(window.sessionStorage.getItem).mockImplementation(
      (key: string) => {
        if (key === 'audiusPkceCodeVerifier') return 'test-verifier'
        return null
      }
    )
    setLocationWithCode('auth-code-123', 'wrong-state')
    ;(window as any).history = { replaceState: vi.fn() }

    const oauth = new OAuth({
      apiKey: 'test-api-key',
      basePath: 'https://api.example.com',
      tokenStore
    })
    expect(oauth.hasRedirectResult).toBe(true)
    expect(await oauth.getRedirectResult()).toBeNull()
    expect(oauth.hasRedirectResult).toBe(false)

    resetLocation()
  })

  it('cleans up the URL after detecting redirect params', async () => {
    vi.mocked(window.sessionStorage.getItem).mockImplementation(
      (key: string) => {
        if (key === 'audiusOauthState') return 'test-state'
        if (key === 'audiusPkceCodeVerifier') return 'test-verifier'
        return null
      }
    )
    setLocationWithCode('auth-code-123', 'test-state')
    const replaceStateSpy = vi.fn()
    ;(window as any).history = { replaceState: replaceStateSpy }

    // Mock fetch so the exchange doesn't fail
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'a', refresh_token: 'r' }), {
        status: 200
      })
    )
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ userId: 1, handle: 'x' }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const oauth = new OAuth({
      apiKey: 'test-api-key',
      basePath: 'https://api.example.com',
      tokenStore
    })

    // URL cleanup doesn't happen until getRedirectResult triggers detection
    expect(replaceStateSpy).not.toHaveBeenCalled()
    await oauth.getRedirectResult()

    expect(replaceStateSpy).toHaveBeenCalledTimes(1)
    const cleanedUrl = replaceStateSpy.mock.calls[0]?.[2]
    expect(cleanedUrl).not.toContain('code=')
    expect(cleanedUrl).not.toContain('state=')

    resetLocation()
  })

  it('cleans up sessionStorage keys on redirect detection', async () => {
    vi.mocked(window.sessionStorage.getItem).mockImplementation(
      (key: string) => {
        if (key === 'audiusOauthState') return 'test-state'
        if (key === 'audiusPkceCodeVerifier') return 'test-verifier'
        if (key === 'audiusPkceRedirectUri')
          return 'https://example.com/callback'
        return null
      }
    )
    setLocationWithCode('auth-code-123', 'test-state')
    ;(window as any).history = { replaceState: vi.fn() }
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'a', refresh_token: 'r' }), {
        status: 200
      })
    )
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ userId: 1, handle: 'x' }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const oauth = new OAuth({
      apiKey: 'test-api-key',
      basePath: 'https://api.example.com',
      tokenStore
    })

    // Trigger detection
    await oauth.getRedirectResult()

    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith(
      'audiusPkceCodeVerifier'
    )
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith(
      'audiusPkceRedirectUri'
    )

    resetLocation()
  })

  it('detects code in URL fragment (responseMode=fragment)', async () => {
    vi.mocked(window.sessionStorage.getItem).mockImplementation(
      (key: string) => {
        if (key === 'audiusOauthState') return 'test-state'
        if (key === 'audiusPkceCodeVerifier') return 'test-verifier'
        return null
      }
    )
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://example.com/callback#code=frag-code&state=test-state',
        origin: 'https://example.com',
        search: '',
        hash: '#code=frag-code&state=test-state'
      },
      writable: true
    })
    ;(window as any).history = { replaceState: vi.fn() }

    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'access-frag',
          refresh_token: 'refresh-frag'
        }),
        { status: 200 }
      )
    )
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(mockProfile), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const oauth = new OAuth({
      apiKey: 'test-api-key',
      basePath: 'https://api.example.com',
      tokenStore
    })

    expect(oauth.hasRedirectResult).toBe(true)
    const result = await oauth.getRedirectResult()
    expect(result).not.toBeNull()
    expect(result!.encodedJwt).toBe('access-frag')

    resetLocation()
  })

  it('forwards code+state to opener via postMessage when in a popup', async () => {
    setLocationWithCode('popup-code', 'test-state')
    const postMessageSpy = vi.fn()
    const closeSpy = vi.fn()
    ;(window as any).opener = { postMessage: postMessageSpy }
    ;(window as any).close = closeSpy
    ;(window as any).history = { replaceState: vi.fn() }

    const oauth = new OAuth({
      apiKey: 'test-api-key',
      basePath: 'https://api.example.com',
      tokenStore
    })

    // Nothing happens until getRedirectResult is called
    expect(postMessageSpy).not.toHaveBeenCalled()
    await oauth.getRedirectResult()

    expect(postMessageSpy).toHaveBeenCalledWith(
      { code: 'popup-code', state: 'test-state' },
      'https://example.com'
    )
    expect(closeSpy).toHaveBeenCalled()
    // Should NOT start a local exchange
    expect(oauth.hasRedirectResult).toBe(false)
    ;(window as any).opener = null
    resetLocation()
  })
})
