import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { FetchError, ResponseError } from '../api/generated/default/runtime'

import { OAuth } from './OAuth'
import { OAuthTokenStore } from './tokenStore'

// The OAuth constructor requires `window` to be defined (it is browser-only).
// Stub just enough of the browser global so we can instantiate OAuth in Node.
vi.stubGlobal('window', {
  localStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  sessionStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  crypto: {
    getRandomValues: vi.fn((arr: Uint8Array) => arr.fill(0)),
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  location: { href: '', origin: 'https://example.com' },
  open: vi.fn()
})

/** Flush all pending microtasks (including chained promise continuations). */
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

function makeOAuth(
  overrides: {
    apiKey?: string | null
    basePath?: string
    tokenStore?: OAuthTokenStore
  } = {}
): OAuth {
  const {
    apiKey = 'test-api-key',
    basePath = 'https://api.example.com',
    tokenStore
  } = overrides
  return new OAuth({
    basePath,
    ...(apiKey !== null ? { apiKey } : {}),
    ...(tokenStore !== undefined ? { tokenStore } : {})
  })
}

// ---------------------------------------------------------------------------
// refreshAccessToken
// ---------------------------------------------------------------------------

describe('OAuth.refreshAccessToken', () => {
  let tokenStore: OAuthTokenStore
  let oauth: OAuth

  beforeEach(() => {
    tokenStore = new OAuthTokenStore()
    tokenStore.setTokens('old-access', 'old-refresh')
    oauth = makeOAuth({ tokenStore })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('updates token store and returns new access token', async () => {
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
        JSON.stringify({ access_token: 'new-access', refresh_token: 'new-refresh' }),
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

  it('returns null and does not update store when access_token is missing', async () => {
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

  it('returns null and does not update store when refresh_token is missing', async () => {
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

  it('returns null when tokenStore is not configured', async () => {
    const result = await makeOAuth().refreshAccessToken()
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

// ---------------------------------------------------------------------------
// login — guard conditions
// ---------------------------------------------------------------------------

describe('OAuth.login guards', () => {
  let oauth: OAuth

  beforeEach(() => {
    vi.mocked(window.open).mockReturnValue({
      closed: false,
      close: vi.fn()
    } as unknown as Window)
    vi.mocked(window.sessionStorage.getItem).mockReturnValue(null)
    vi.mocked(window.addEventListener).mockClear()
    oauth = makeOAuth()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws synchronously when a login is already in progress', async () => {
    oauth.login({ redirectUri: 'https://example.com/cb' }).catch(() => {})
    await expect(
      oauth.login({ redirectUri: 'https://example.com/cb' })
    ).rejects.toThrow('A login is already in progress.')
  })

  it('rejects when neither apiKey nor appName is configured', async () => {
    const bare = new OAuth({ basePath: 'https://api.example.com' })
    await expect(
      bare.login({ redirectUri: 'https://example.com/cb' })
    ).rejects.toThrow('App name or API key not set.')
  })

  it('rejects when write scope is requested without an apiKey', async () => {
    const noKey = new OAuth({
      basePath: 'https://api.example.com',
      appName: 'my-app'
    })
    await expect(
      noKey.login({ redirectUri: 'https://example.com/cb', scope: 'write' })
    ).rejects.toThrow("The 'write' scope requires")
  })

  it('rejects when an invalid scope is provided', async () => {
    await expect(
      oauth.login({ redirectUri: 'https://example.com/cb', scope: 'admin' as any })
    ).rejects.toThrow('Scope must be')
  })
})

// ---------------------------------------------------------------------------
// message listener lifecycle
// ---------------------------------------------------------------------------

describe('OAuth message listener lifecycle', () => {
  beforeEach(() => {
    vi.mocked(window.addEventListener).mockClear()
    vi.mocked(window.removeEventListener).mockClear()
    vi.mocked(window.open).mockReturnValue({
      closed: false,
      close: vi.fn()
    } as unknown as Window)
    vi.mocked(window.sessionStorage.setItem).mockClear()
    vi.mocked(window.sessionStorage.getItem).mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not attach a message listener in the constructor', () => {
    makeOAuth()
    expect(window.addEventListener).not.toHaveBeenCalled()
  })

  it('attaches a message listener when popup login starts', async () => {
    const oauth = makeOAuth()
    oauth.login({ redirectUri: 'https://example.com/cb', display: 'popup' }).catch(() => {})
    await flushPromises()
    expect(window.addEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
      false
    )
  })

  it('does not attach a duplicate listener on repeated login calls', async () => {
    const oauth = makeOAuth()
    oauth.login({ redirectUri: 'https://example.com/cb' }).catch(() => {})
    await flushPromises()
    // Second call throws "A login is already in progress" — suppress rejection
    oauth.login({ redirectUri: 'https://example.com/cb' }).catch(() => {})
    await flushPromises()
    const messageAddCalls = vi
      .mocked(window.addEventListener)
      .mock.calls.filter(([event]) => event === 'message')
    expect(messageAddCalls).toHaveLength(1)
  })

  it('removes the message listener when the login settles', async () => {
    const oauth = makeOAuth()
    const loginPromise = oauth.login({ redirectUri: 'https://example.com/cb' })
    await flushPromises()

    const addCall = vi
      .mocked(window.addEventListener)
      .mock.calls.find(([event]) => event === 'message')
    expect(addCall).toBeDefined()
    const registeredHandler = addCall![1]

    ;(oauth as any)._settleLogin(new Error('test settle'))
    await loginPromise.catch(() => {})

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'message',
      registeredHandler,
      false
    )
  })

  it('does not attach a listener when display is fullScreen', async () => {
    const oauth = makeOAuth()
    oauth
      .login({ redirectUri: 'https://example.com/cb', display: 'fullScreen' })
      .catch(() => {})
    await flushPromises()
    expect(window.addEventListener).not.toHaveBeenCalledWith(
      'message',
      expect.any(Function),
      false
    )
  })
})

// ---------------------------------------------------------------------------
// _receiveMessage — popup parent-side handler
// ---------------------------------------------------------------------------

describe('OAuth._receiveMessage (popup parent handler)', () => {
  const CSRF_STATE = 'test-csrf-state'
  const CODE_VERIFIER = 'test-code-verifier'
  const REDIRECT_URI = 'https://example.com/callback'

  let tokenStore: OAuthTokenStore
  let fakePopup: { closed: boolean; close: ReturnType<typeof vi.fn> }
  let oauth: OAuth
  let loginPromise: Promise<void>

  function makeEvent(data: object, source?: unknown): MessageEvent {
    return { data, source: source ?? fakePopup } as unknown as MessageEvent
  }

  beforeEach(async () => {
    tokenStore = new OAuthTokenStore()
    fakePopup = { closed: false, close: vi.fn() }
    vi.mocked(window.open).mockReturnValue(fakePopup as unknown as Window)
    vi.mocked(window.addEventListener).mockClear()
    vi.mocked(window.removeEventListener).mockClear()
    vi.mocked(window.sessionStorage.getItem).mockImplementation((key: string) => {
      if (key === 'audiusOauthState') return CSRF_STATE
      if (key === 'audiusPkceCodeVerifier') return CODE_VERIFIER
      if (key === 'audiusPkceRedirectUri') return REDIRECT_URI
      return null
    })
    oauth = makeOAuth({ tokenStore })
    loginPromise = oauth.login({ redirectUri: REDIRECT_URI })
    await flushPromises()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    loginPromise.catch(() => {})
  })

  it('ignores messages not from the active popup window', async () => {
    await oauth._receiveMessage(
      makeEvent({ code: 'c', state: CSRF_STATE }, { closed: false })
    )
    expect(window.removeEventListener).not.toHaveBeenCalled()
  })

  it('ignores messages without a state field', async () => {
    await oauth._receiveMessage(makeEvent({ code: 'c' }))
    expect(window.removeEventListener).not.toHaveBeenCalled()
  })

  it('rejects login when state does not match the CSRF token', async () => {
    const settled = loginPromise.catch((e: Error) => e)
    await oauth._receiveMessage(makeEvent({ code: 'c', state: 'wrong' }))
    const error = await settled
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toMatch(/state mismatch/i)
  })

  it('rejects login when code verifier is missing from sessionStorage', async () => {
    vi.mocked(window.sessionStorage.getItem).mockImplementation((key: string) =>
      key === 'audiusOauthState' ? CSRF_STATE : null
    )
    const settled = loginPromise.catch((e: Error) => e)
    await oauth._receiveMessage(makeEvent({ code: 'c', state: CSRF_STATE }))
    const error = await settled
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toMatch(/code verifier/i)
  })

  it('resolves login and stores tokens on successful exchange', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'at', refresh_token: 'rt' }),
          { status: 200 }
        )
      )
    )
    await Promise.all([
      oauth._receiveMessage(makeEvent({ code: 'auth-code', state: CSRF_STATE })),
      loginPromise
    ])
    expect(tokenStore.accessToken).toBe('at')
    expect(tokenStore.refreshToken).toBe('rt')
  })

  it('closes the popup after successful exchange', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'at', refresh_token: 'rt' }),
          { status: 200 }
        )
      )
    )
    await Promise.all([
      oauth._receiveMessage(makeEvent({ code: 'auth-code', state: CSRF_STATE })),
      loginPromise
    ])
    expect(fakePopup.close).toHaveBeenCalled()
  })

  it('rejects login when the token exchange request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error_description: 'bad_code' }),
          { status: 400 }
        )
      )
    )
    await expect(
      Promise.all([
        oauth._receiveMessage(makeEvent({ code: 'auth-code', state: CSRF_STATE })),
        loginPromise
      ])
    ).rejects.toThrow('bad_code')
  })

  it('rejects login with "unknown format" when message has no code', async () => {
    const settled = loginPromise.catch((e: Error) => e)
    await oauth._receiveMessage(makeEvent({ state: CSRF_STATE }))
    const error = await settled
    expect((error as Error).message).toMatch(/unknown format/i)
  })
})

// ---------------------------------------------------------------------------
// isAuthenticated / hasRefreshToken
// ---------------------------------------------------------------------------

describe('OAuth.isAuthenticated / hasRefreshToken', () => {
  it('isAuthenticated is false when no token store is configured', () => {
    expect(makeOAuth().isAuthenticated).toBe(false)
  })

  it('isAuthenticated is false when token store has no access token', () => {
    const tokenStore = new OAuthTokenStore()
    expect(makeOAuth({ tokenStore }).isAuthenticated).toBe(false)
  })

  it('isAuthenticated is true when an access token is stored', () => {
    const tokenStore = new OAuthTokenStore()
    tokenStore.setTokens('at', 'rt')
    expect(makeOAuth({ tokenStore }).isAuthenticated).toBe(true)
  })

  it('hasRefreshToken is false when no token store is configured', () => {
    expect(makeOAuth().hasRefreshToken).toBe(false)
  })

  it('hasRefreshToken is true when a refresh token is stored', () => {
    const tokenStore = new OAuthTokenStore()
    tokenStore.setTokens('at', 'rt')
    expect(makeOAuth({ tokenStore }).hasRefreshToken).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getUser
// ---------------------------------------------------------------------------

describe('OAuth.getUser', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends Authorization header and returns user data when token is stored', async () => {
    const tokenStore = new OAuthTokenStore()
    tokenStore.setTokens('my-access-token', 'rt')
    const oauth = makeOAuth({ tokenStore })
    const userData = { id: '1', handle: 'foo' }
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(userData), { status: 200 })
      )
    vi.stubGlobal('fetch', fetchSpy)

    const result = await oauth.getUser()

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/oauth/me',
      expect.objectContaining({
        headers: { Authorization: 'Bearer my-access-token' }
      })
    )
    expect(result).toEqual(userData)
  })

  it('makes the request without an Authorization header when no token is stored', async () => {
    const oauth = makeOAuth()
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: '1' }), { status: 200 })
      )
    vi.stubGlobal('fetch', fetchSpy)

    await oauth.getUser()

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/oauth/me',
      expect.objectContaining({ headers: {} })
    )
  })

  it('throws ResponseError on non-2xx response', async () => {
    const oauth = makeOAuth()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 }))
    )

    await expect(oauth.getUser()).rejects.toBeInstanceOf(ResponseError)
  })

  it('throws FetchError when the network request fails', async () => {
    const oauth = makeOAuth()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValueOnce(new Error('network down'))
    )

    await expect(oauth.getUser()).rejects.toBeInstanceOf(FetchError)
  })
})

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------

describe('OAuth.logout', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends a revoke request and clears the token store when a refresh token exists', async () => {
    const tokenStore = new OAuthTokenStore()
    tokenStore.setTokens('at', 'my-refresh')
    const oauth = makeOAuth({ tokenStore })
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)

    await oauth.logout()

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/oauth/revoke',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'my-refresh', client_id: 'test-api-key' })
      })
    )
    expect(tokenStore.accessToken).toBeNull()
    expect(tokenStore.refreshToken).toBeNull()
  })

  it('skips the revoke request when there is no refresh token', async () => {
    const tokenStore = new OAuthTokenStore()
    const oauth = makeOAuth({ tokenStore })
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    await oauth.logout()

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does not throw when the revoke request fails', async () => {
    const tokenStore = new OAuthTokenStore()
    tokenStore.setTokens('at', 'rt')
    const oauth = makeOAuth({ tokenStore })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network')))

    await expect(oauth.logout()).resolves.toBeUndefined()
    expect(tokenStore.accessToken).toBeNull()
  })

  it('clears PKCE sessionStorage keys on logout', async () => {
    const oauth = makeOAuth()
    vi.stubGlobal('fetch', vi.fn())
    vi.mocked(window.sessionStorage.removeItem).mockClear()

    await oauth.logout()

    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith(
      'audiusPkceCodeVerifier'
    )
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith(
      'audiusPkceRedirectUri'
    )
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith(
      'audiusOauthState'
    )
  })
})

// ---------------------------------------------------------------------------
// getRedirectResult / _exchangeCodeForTokens
// ---------------------------------------------------------------------------

describe('OAuth.getRedirectResult', () => {
  let tokenStore: OAuthTokenStore

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

  it('exchanges code for tokens and stores them', async () => {
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

    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'access-123',
          refresh_token: 'refresh-123'
        }),
        { status: 200 }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const oauth = new OAuth({
      apiKey: 'test-api-key',
      basePath: 'https://api.example.com',
      tokenStore
    })

    expect(oauth.hasRedirectResult).toBe(true)
    await oauth.getRedirectResult()

    expect(tokenStore.accessToken).toBe('access-123')
    expect(tokenStore.refreshToken).toBe('refresh-123')

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

    // Result is consumed — subsequent calls are no-ops
    expect(oauth.hasRedirectResult).toBe(false)
    await oauth.getRedirectResult()

    resetLocation()
  })

  it('is a no-op when no code/state in URL', async () => {
    resetLocation()
    const oauth = makeOAuth({ tokenStore })
    expect(oauth.hasRedirectResult).toBe(false)
    await oauth.getRedirectResult()
  })

  it('is a no-op when code verifier is missing from sessionStorage', async () => {
    vi.mocked(window.sessionStorage.getItem).mockReturnValue(null)
    setLocationWithCode('auth-code-123', 'test-state')
    ;(window as any).history = { replaceState: vi.fn() }

    const oauth = new OAuth({
      apiKey: 'test-api-key',
      basePath: 'https://api.example.com',
      tokenStore
    })
    expect(oauth.hasRedirectResult).toBe(true)
    await oauth.getRedirectResult()
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
    await oauth.getRedirectResult()
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

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ access_token: 'a', refresh_token: 'r' }),
            { status: 200 }
          )
        )
    )

    const oauth = new OAuth({
      apiKey: 'test-api-key',
      basePath: 'https://api.example.com',
      tokenStore
    })

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
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ access_token: 'a', refresh_token: 'r' }),
            { status: 200 }
          )
        )
    )

    const oauth = new OAuth({
      apiKey: 'test-api-key',
      basePath: 'https://api.example.com',
      tokenStore
    })

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

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'access-frag',
            refresh_token: 'refresh-frag'
          }),
          { status: 200 }
        )
      )
    )

    const oauth = new OAuth({
      apiKey: 'test-api-key',
      basePath: 'https://api.example.com',
      tokenStore
    })

    expect(oauth.hasRedirectResult).toBe(true)
    await oauth.getRedirectResult()
    expect(tokenStore.accessToken).toBe('access-frag')
    expect(tokenStore.refreshToken).toBe('refresh-frag')

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

    expect(postMessageSpy).not.toHaveBeenCalled()
    await oauth.getRedirectResult()

    expect(postMessageSpy).toHaveBeenCalledWith(
      { code: 'popup-code', state: 'test-state' },
      'https://example.com'
    )
    expect(closeSpy).toHaveBeenCalled()
    expect(oauth.hasRedirectResult).toBe(false)
    ;(window as any).opener = null
    resetLocation()
  })
})
