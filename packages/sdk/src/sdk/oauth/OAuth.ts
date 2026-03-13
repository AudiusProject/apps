import type { DecodedUserToken } from '../api/generated/default'
import { FetchError, ResponseError } from '../api/generated/default/runtime'
import { Logger, type LoggerService } from '../services/Logger'
import { isOAuthScopeValid } from '../utils/oauthScope'

import { generateCodeVerifier, generateCodeChallenge } from './pkce'
import type { OAuthTokenStore } from './tokenStore'
import { OAuthScope } from './types'

const CSRF_TOKEN_KEY = 'audiusOauthState'
const PKCE_VERIFIER_KEY = 'audiusPkceCodeVerifier'
const PKCE_REDIRECT_URI_KEY = 'audiusPkceRedirectUri'

const generateId = (): string => {
  const arr = new Uint8Array(20)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

type OAuthConfig = {
  appName?: string
  apiKey?: string
  logger?: LoggerService
  tokenStore?: OAuthTokenStore
  basePath: string
}

export class OAuth {
  activePopupWindow: null | Window
  popupCheckInterval: any | null
  apiKey: string | null
  logger: LoggerService
  private _currentLoginResolve: (() => void) | null = null
  private _currentLoginReject: ((error: Error) => void) | null = null
  private _boundMessageHandler: ((e: MessageEvent) => void) | null = null
  private _redirectResult: Promise<void> | null = null
  private _redirectChecked = false

  constructor(private readonly config: OAuthConfig) {
    if (typeof window === 'undefined') {
      throw new Error(
        'Audius OAuth SDK functions are only available in browser. Refer to our documentation to learn how to implement Audius OAuth manually: https://docs.audius.co/developers/log-in-with-audius#manual-implementation.'
      )
    }
    this.apiKey = config.apiKey ?? null
    this.activePopupWindow = null
    this.popupCheckInterval = null
    this.logger = (config.logger ?? new Logger()).createPrefixedLogger(
      '[oauth]'
    )
  }

  /**
   * Opens the Audius consent screen to authorize your app using the
   * OAuth 2.0 Authorization Code Flow with PKCE.
   *
   * - **Popup** (default): opens a small window. The popup redirects to
   *   `redirectUri`, where `getRedirectResult()` forwards the authorization
   *   code back to this window and closes the popup. The returned promise
   *   resolves when the token exchange is complete.
   * - **Full-page redirect**: navigates the current page to Audius. After
   *   the user approves, Audius redirects back to `redirectUri`. Call
   *   `getRedirectResult()` on the next mount to complete the exchange.
   *
   * After a successful login, call `getUser()` to retrieve the user profile.
   * Subsequent SDK calls that require authentication use the stored access
   * token automatically.
   *
   * Throws if the login fails or the popup is closed prematurely.
   */
  async login({
    scope = 'read',
    redirectUri,
    display = 'popup',
    responseMode = 'fragment'
  }: {
    scope?: OAuthScope
    /** The registered redirect URI where Audius sends the user after consent. */
    redirectUri: string
    display?: 'popup' | 'fullScreen'
    responseMode?: 'fragment' | 'query'
  }): Promise<void> {
    if (this._currentLoginResolve != null) {
      throw new Error('A login is already in progress.')
    }

    const promise = new Promise<void>((resolve, reject) => {
      this._currentLoginResolve = resolve
      this._currentLoginReject = reject
    })

    const scopeFormatted = typeof scope === 'string' ? [scope] : scope

    if (!this.config.appName && !this.apiKey) {
      this._settleLogin(new Error('App name or API key not set.'))
      return promise
    }
    if (scopeFormatted.includes('write') && !this.apiKey) {
      this._settleLogin(
        new Error(
          "The 'write' scope requires Audius SDK to be initialized with an API key"
        )
      )
      return promise
    }
    if (!isOAuthScopeValid(scopeFormatted)) {
      this._settleLogin(new Error('Scope must be `read` or `write`.'))
      return promise
    }
    const effectiveScope = scopeFormatted.includes('write') ? 'write' : 'read'
    const csrfToken = generateId()
    window.sessionStorage.setItem(CSRF_TOKEN_KEY, csrfToken)

    const codeVerifier = generateCodeVerifier()
    window.sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier)
    window.sessionStorage.setItem(PKCE_REDIRECT_URI_KEY, redirectUri)

    let codeChallenge: string
    try {
      codeChallenge = await generateCodeChallenge(codeVerifier)
    } catch (e) {
      this._settleLogin(
        new Error(
          e instanceof Error
            ? `PKCE code challenge generation failed: ${e.message}`
            : 'PKCE code challenge generation failed.'
        )
      )
      return promise
    }

    const originURISafe = encodeURIComponent(window.location.origin)
    const appIdURISafe = encodeURIComponent(
      (this.apiKey || this.config.appName)!
    )
    const appIdURIParam = `${this.apiKey ? 'api_key' : 'app_name'}=${appIdURISafe}`
    const pkceParams = `&response_type=code&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`

    const fullOauthUrl = `${this.config.basePath}/oauth/authorize?scope=${effectiveScope}&state=${csrfToken}&redirect_uri=${encodeURIComponent(redirectUri)}&origin=${originURISafe}&response_mode=${responseMode}&${appIdURIParam}${pkceParams}&display=${display}`

    if (display === 'popup') {
      if (!this._boundMessageHandler) {
        this._boundMessageHandler = (e: MessageEvent) => this._receiveMessage(e)
        window.addEventListener('message', this._boundMessageHandler, false)
      }
      this.activePopupWindow = window.open(
        fullOauthUrl,
        '',
        'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=375, height=785, top=100, left=100'
      )
      if (!this.activePopupWindow) {
        this._settleLogin(
          new Error(
            'The login popup was blocked. Please allow popups for this site and try again.'
          )
        )
        return promise
      }
      this._clearPopupCheckInterval()
      this.popupCheckInterval = setInterval(() => {
        if (this.activePopupWindow?.closed) {
          this._settleLogin(
            new Error('The login popup was closed prematurely.')
          )
          clearInterval(this.popupCheckInterval)
        }
      }, 500)
    } else {
      window.location.href = fullOauthUrl
    }

    return promise
  }

  getCsrfToken() {
    return window.sessionStorage.getItem(CSRF_TOKEN_KEY)
  }

  /**
   * Returns true if the current page load contains OAuth redirect params
   * (`code` + `state`) that haven't been consumed via `getRedirectResult()`.
   *
   * Before `getRedirectResult()` has been called, this performs a lightweight
   * URL check (no network requests). After, it reflects whether a cached
   * result is still pending.
   */
  get hasRedirectResult(): boolean {
    if (this._redirectChecked) {
      return this._redirectResult != null
    }
    const queryParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(
      window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : ''
    )
    const code = queryParams.get('code') ?? hashParams.get('code')
    const state = queryParams.get('state') ?? hashParams.get('state')
    return !!(code && state)
  }

  /**
   * Call on every page load to handle an OAuth redirect.
   *
   * - **Popup**: detects `window.opener`, forwards the authorization code to
   *   the parent window, and closes the popup. The parent's `login()`
   *   promise resolves.
   * - **Full-page redirect**: performs the PKCE token exchange, stores the
   *   tokens, and cleans up the URL. Call `getUser()` afterwards to retrieve
   *   the user profile.
   *
   * Is a no-op when no redirect params are present.
   * The result can only be consumed once — subsequent calls are no-ops.
   */
  async getRedirectResult(): Promise<void> {
    if (!this._redirectChecked) {
      this._redirectChecked = true
      this._handleRedirectResult()
    }
    if (!this._redirectResult) {
      return
    }
    try {
      await this._redirectResult
    } finally {
      this._redirectResult = null
    }
  }

  /**
   * Returns true if the user is currently authenticated (i.e. an access
   * token is present in the token store).
   */
  get isAuthenticated(): boolean {
    return !!this.config.tokenStore?.accessToken
  }

  /**
   * Returns true if a refresh token is currently stored and a refresh
   * exchange could be attempted.
   */
  get hasRefreshToken(): boolean {
    return !!this.config.tokenStore?.refreshToken
  }

  /**
   * Fetches the authenticated user's profile from the server using the stored
   * access token. Always makes a network request, so the result reflects
   * current server-side state (useful for detecting revoked sessions or
   * refreshing stale profile data on page load).
   *
   * Throws `ResponseError` if the server returns a non-2xx response (e.g. 401
   * if no token is stored or the token has expired), or `FetchError` if the
   * request fails at the network level.
   */
  async getUser(): Promise<DecodedUserToken> {
    const accessToken = this.config.tokenStore?.accessToken
    const headers: Record<string, string> = {}
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }
    let res: Response
    try {
      res = await fetch(`${this.config.basePath}/oauth/me`, { headers })
    } catch (e) {
      throw new FetchError(
        e instanceof Error ? e : new Error(String(e)),
        'Failed to fetch user profile.'
      )
    }
    if (!res.ok) {
      throw new ResponseError(res, 'Failed to fetch user profile.')
    }
    return (await res.json()) as DecodedUserToken
  }

  /**
   * Refreshes the access token using the stored refresh token.
   * Updates the token store on success.
   * Returns the new access token, or `null` if the refresh failed.
   */
  async refreshAccessToken(): Promise<string | null> {
    if (!this.config.tokenStore) {
      this.logger.error('Token store is required for token refresh.')
      return null
    }
    const refreshToken = this.config.tokenStore.refreshToken
    if (!refreshToken) {
      this.logger.error('No refresh token available.')
      return null
    }
    try {
      const res = await fetch(`${this.config.basePath}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.apiKey
        })
      })
      if (!res.ok) {
        return null
      }
      const tokens = await res.json()
      if (tokens.access_token && tokens.refresh_token) {
        this.config.tokenStore.setTokens(
          tokens.access_token,
          tokens.refresh_token
        )
        return tokens.access_token
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Revokes the current refresh token server-side and clears all stored
   * tokens and PKCE session state. After this call, all SDK API calls revert
   * to unauthenticated.
   */
  async logout(): Promise<void> {
    if (this.config.tokenStore?.refreshToken) {
      try {
        await fetch(`${this.config.basePath}/oauth/revoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: this.config.tokenStore.refreshToken,
            client_id: this.apiKey
          })
        })
      } catch {
        // Per RFC 7009, revocation errors are non-fatal
      }
    }
    this.config.tokenStore?.clear()
    window.sessionStorage.removeItem(PKCE_VERIFIER_KEY)
    window.sessionStorage.removeItem(PKCE_REDIRECT_URI_KEY)
    window.sessionStorage.removeItem(CSRF_TOKEN_KEY)
  }

  /* ------- INTERNAL FUNCTIONS ------- */

  /**
   * Exchange an authorization code + PKCE verifier for tokens and store them.
   * Shared by the popup `_receiveMessage` handler and `_handleRedirectResult`.
   */
  private async _exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<void> {
    const tokenRes = await fetch(`${this.config.basePath}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        client_id: this.apiKey,
        redirect_uri: redirectUri
      })
    })
    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}))
      throw new Error(err.error_description ?? 'Token exchange failed.')
    }
    const tokens = await tokenRes.json()
    this.config.tokenStore?.setTokens(tokens.access_token, tokens.refresh_token)
  }

  /**
   * Called lazily from `getRedirectResult()`. Checks `window.location` for
   * OAuth redirect params (`code` + `state`).
   *
   * If running inside a popup (i.e. `window.opener` exists), the code and
   * state are forwarded back to the opener via `postMessage` and the popup
   * closes itself. The opener's `_receiveMessage` handler then performs the
   * token exchange using the PKCE verifier from **its** `sessionStorage`.
   *
   * If running as a full-page redirect, the token exchange is performed
   * locally and the result is stored as `_redirectResult`.
   *
   * Also cleans up the URL (via `history.replaceState`) so that stale
   * `code` params cannot be bookmarked or replayed.
   */
  private _handleRedirectResult(): void {
    const queryParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(
      window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : ''
    )

    const code = queryParams.get('code') ?? hashParams.get('code')
    const state = queryParams.get('state') ?? hashParams.get('state')
    const openerOrigin =
      queryParams.get('origin') ??
      hashParams.get('origin') ??
      window.location.origin

    if (!code || !state) {
      return
    }

    // If running inside a popup (opened by login on the parent page),
    // forward the code + state back to the opener and close. The opener's
    // _receiveMessage handler will do the exchange using its own verifier.
    if (window.opener) {
      try {
        window.opener.postMessage({ code, state }, openerOrigin)
      } catch {
        // Cannot communicate with opener — fall through to local handling
      }
      window.close()
      return
    }

    // Full-page redirect flow — handle the exchange locally
    const codeVerifier = window.sessionStorage.getItem(PKCE_VERIFIER_KEY)
    if (!codeVerifier) {
      // No verifier means this isn't our redirect (stale bookmark, etc.)
      return
    }

    // Verify CSRF state
    if (this.getCsrfToken() !== state) {
      window.sessionStorage.removeItem(PKCE_VERIFIER_KEY)
      window.sessionStorage.removeItem(PKCE_REDIRECT_URI_KEY)
      this.logger.error('OAuth redirect state mismatch.')
      return
    }

    const storedRedirectUri = window.sessionStorage.getItem(
      PKCE_REDIRECT_URI_KEY
    )

    // Clean up PKCE session state
    window.sessionStorage.removeItem(PKCE_VERIFIER_KEY)
    window.sessionStorage.removeItem(PKCE_REDIRECT_URI_KEY)

    const redirectUriForExchange =
      storedRedirectUri ??
      `${window.location.origin}${window.location.pathname}`

    // Remove code/state from the URL to prevent stale bookmarks
    try {
      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('code')
      cleanUrl.searchParams.delete('state')
      if (cleanUrl.hash) {
        const hp = new URLSearchParams(cleanUrl.hash.slice(1))
        hp.delete('code')
        hp.delete('state')
        const remaining = hp.toString()
        cleanUrl.hash = remaining ? `#${remaining}` : ''
      }
      window.history.replaceState(null, '', cleanUrl.toString())
    } catch {
      // Non-fatal — URL cleanup is best-effort
    }

    this._redirectResult = this._exchangeCodeForTokens(
      code,
      codeVerifier,
      redirectUriForExchange
    ).catch((err) => {
      this.logger.error(
        'OAuth redirect token exchange failed:',
        err instanceof Error ? err.message : err
      )
      throw err
    })
  }

  private _settleLogin(error?: Error) {
    if (error) {
      this._currentLoginReject?.(error)
    } else {
      this._currentLoginResolve?.()
    }
    this._currentLoginResolve = null
    this._currentLoginReject = null
    if (this._boundMessageHandler) {
      window.removeEventListener('message', this._boundMessageHandler, false)
      this._boundMessageHandler = null
    }
    this._clearPopupCheckInterval()
  }

  _clearPopupCheckInterval() {
    if (this.popupCheckInterval) {
      clearInterval(this.popupCheckInterval)
    }
  }

  async _receiveMessage(event: MessageEvent) {
    if (
      !event.data ||
      !event.data.state ||
      event.source !== this.activePopupWindow
    ) {
      return
    }

    if (event.data.code) {
      this._clearPopupCheckInterval()
      if (this.activePopupWindow) {
        if (!this.activePopupWindow.closed) {
          this.activePopupWindow.close()
        }
        this.activePopupWindow = null
      }

      if (this.getCsrfToken() !== event.data.state) {
        this._settleLogin(new Error('State mismatch.'))
        return
      }

      const codeVerifier = window.sessionStorage.getItem(PKCE_VERIFIER_KEY)
      const storedRedirectUri = window.sessionStorage.getItem(
        PKCE_REDIRECT_URI_KEY
      )
      window.sessionStorage.removeItem(PKCE_VERIFIER_KEY)
      window.sessionStorage.removeItem(PKCE_REDIRECT_URI_KEY)

      if (!codeVerifier) {
        this._settleLogin(
          new Error('PKCE code verifier not found in session storage.')
        )
        return
      }

      try {
        await this._exchangeCodeForTokens(
          event.data.code,
          codeVerifier,
          storedRedirectUri ?? window.location.origin
        )
        this._settleLogin()
      } catch (e) {
        this._settleLogin(
          e instanceof Error ? e : new Error('Token exchange failed.')
        )
      }
      return
    }

    this._settleLogin(new Error('Received message with unknown format.'))
  }
}
