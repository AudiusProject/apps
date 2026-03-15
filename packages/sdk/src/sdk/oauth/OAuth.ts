import type { DecodedUserToken } from '../api/generated/default'
import { FetchError, ResponseError } from '../api/generated/default/runtime'
import { Logger, type LoggerService } from '../services/Logger'
import { isOAuthScopeValid } from '../utils/oauthScope'

import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState
} from './pkce'
import type { OAuthTokenStore } from './tokenStore'
import { OAuthScope } from './types'

const CSRF_TOKEN_KEY = 'audiusOauthState'
const PKCE_VERIFIER_KEY = 'audiusPkceCodeVerifier'
const PKCE_REDIRECT_URI_KEY = 'audiusPkceRedirectUri'

type OAuthConfig = {
  appName?: string
  apiKey?: string
  logger?: LoggerService
  tokenStore: OAuthTokenStore
  basePath: string
  redirectUri?: string
  openUrl?: (url: string) => void | Promise<void>
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
  private _csrfToken: string | null = null
  private _pkceVerifier: string | null = null
  private _pkceRedirectUri: string | null = null

  constructor(private readonly config: OAuthConfig) {
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
   *   `redirectUri`, where `handleRedirect()` forwards the authorization
   *   code back to this window and closes the popup. The returned promise
   *   resolves when the token exchange is complete.
   * - **Full-page redirect**: navigates the current page to Audius. After
   *   the user approves, Audius redirects back to `redirectUri`. Call
   *   `handleRedirect()` on the next mount to complete the exchange.
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
    responseMode = 'fragment',
    openUrl
  }: {
    scope?: OAuthScope
    /**
     * The registered redirect URI where Audius sends the user after consent.
     * Falls back to the `redirectUri` set in the top-level SDK config.
     */
    redirectUri?: string
    display?: 'popup' | 'fullScreen'
    responseMode?: 'fragment' | 'query'
    /**
     * Called with the OAuth URL to open it. Defaults to `window.open` (popup)
     * or `window.location.href` (fullScreen) on web.
     */
    openUrl?: (url: string) => void | Promise<void>
  }): Promise<void> {
    if (this._currentLoginResolve != null) {
      throw new Error('A login is already in progress.')
    }

    const promise = new Promise<void>((resolve, reject) => {
      this._currentLoginResolve = resolve
      this._currentLoginReject = reject
    })
    this._redirectChecked = false
    this._redirectResult = null

    try {
      const scopeFormatted = typeof scope === 'string' ? [scope] : scope

      if (!this.config.appName && !this.apiKey) {
        throw new Error('App name or API key not set.')
      }
      if (scopeFormatted.includes('write') && !this.apiKey) {
        throw new Error(
          "The 'write' scope requires Audius SDK to be initialized with an API key"
        )
      }
      if (!isOAuthScopeValid(scopeFormatted)) {
        throw new Error('Scope must be `read` or `write`.')
      }
      const effectiveScope = scopeFormatted.includes('write') ? 'write' : 'read'
      const resolvedRedirectUri = redirectUri ?? this.config.redirectUri
      if (!resolvedRedirectUri) {
        throw new Error(
          'redirectUri is required. Pass it to login() or set it in the SDK config.'
        )
      }
      const csrfToken = generateState()
      const codeVerifier = generateCodeVerifier()
      this._csrfToken = csrfToken
      this._pkceVerifier = codeVerifier
      this._pkceRedirectUri = resolvedRedirectUri
      // Also persist to sessionStorage so the values survive a full-page redirect
      // (which destroys the JS context). Popup and mobile flows use the instance
      // properties above and never need the sessionStorage fallback.
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(CSRF_TOKEN_KEY, csrfToken)
        window.sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier)
        window.sessionStorage.setItem(
          PKCE_REDIRECT_URI_KEY,
          resolvedRedirectUri
        )
      }

      let codeChallenge: string
      try {
        codeChallenge = generateCodeChallenge(codeVerifier)
      } catch (e) {
        throw new Error(
          e instanceof Error
            ? `PKCE code challenge generation failed: ${e.message}`
            : 'PKCE code challenge generation failed.'
        )
      }

      const originParam =
        typeof window !== 'undefined' && window.location
          ? `&origin=${encodeURIComponent(window.location.origin)}`
          : ''
      const appIdURISafe = encodeURIComponent(
        (this.apiKey || this.config.appName)!
      )
      const appIdURIParam = `${this.apiKey ? 'api_key' : 'app_name'}=${appIdURISafe}`
      const pkceParams = `&response_type=code&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`

      const fullOauthUrl = `${this.config.basePath}/oauth/authorize?scope=${effectiveScope}&state=${csrfToken}&redirect_uri=${encodeURIComponent(resolvedRedirectUri)}${originParam}&response_mode=${responseMode}&${appIdURIParam}${pkceParams}&display=${display}`

      const resolvedOpenUrl = openUrl ?? this.config.openUrl
      if (resolvedOpenUrl) {
        await resolvedOpenUrl(fullOauthUrl)
      } else if (display === 'popup') {
        if (!this._boundMessageHandler && typeof window !== 'undefined') {
          this._boundMessageHandler = (e: MessageEvent) =>
            this._receiveMessage(e)
          window.addEventListener('message', this._boundMessageHandler, false)
        }
        this.activePopupWindow = window.open(
          fullOauthUrl,
          '',
          'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=375, height=785, top=100, left=100'
        )
        if (!this.activePopupWindow) {
          throw new Error(
            'The login popup was blocked. Please allow popups for this site and try again.'
          )
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
    } catch (e) {
      this._settleLogin(e instanceof Error ? e : new Error('Login failed.'))
    }

    return promise
  }

  private get csrfToken() {
    return (
      this._csrfToken ??
      (typeof window !== 'undefined' && window.sessionStorage
        ? window.sessionStorage.getItem(CSRF_TOKEN_KEY)
        : null)
    )
  }

  private get pkceVerifier() {
    return (
      this._pkceVerifier ??
      (typeof window !== 'undefined' && window.sessionStorage
        ? window.sessionStorage.getItem(PKCE_VERIFIER_KEY)
        : null)
    )
  }

  private get pkceRedirectUri() {
    return (
      this._pkceRedirectUri ??
      (typeof window !== 'undefined' && window.sessionStorage
        ? window.sessionStorage.getItem(PKCE_REDIRECT_URI_KEY)
        : null)
    )
  }

  /**
   * Returns true if the given URL (or the current page URL on web) contains
   * OAuth redirect params (`code` + `state`) that haven't been consumed via
   * `handleRedirect()` yet.
   *
   * Once `handleRedirect()` is called, this returns `false` for the lifetime
   * of the instance — the result can only be consumed once.
   */
  hasRedirectResult(url?: string): boolean {
    if (this._redirectChecked) {
      return this._redirectResult != null
    }
    const target =
      url ?? (typeof window !== 'undefined' ? window.location.href : null)
    if (!target) return false
    try {
      const parsed = new URL(target)
      const queryParams = parsed.searchParams
      const hashParams = new URLSearchParams(
        parsed.hash.startsWith('#') ? parsed.hash.slice(1) : ''
      )
      const code = queryParams.get('code') ?? hashParams.get('code')
      const state = queryParams.get('state') ?? hashParams.get('state')
      return !!(code && state)
    } catch {
      return false
    }
  }

  /**
   * Completes an OAuth flow by processing the redirect URL.
   *
   * Pass the redirect URL explicitly (mobile deep link) or omit to use the
   * current page URL (web). Is a no-op when no redirect params are present.
   * The result can only be consumed once — subsequent calls are no-ops.
   *
   * - **Web popup**: detects `window.opener`, forwards the code to the parent
   *   window, and closes the popup. The parent's `login()` promise resolves.
   * - **Web full-page redirect / mobile**: performs the PKCE token exchange
   *   and stores the tokens. Call `getUser()` afterwards.
   */
  async handleRedirect(url?: string): Promise<void> {
    if (!this._redirectChecked) {
      this._redirectChecked = true
      const target =
        url ??
        (typeof window !== 'undefined' ? window.location.href : undefined)
      if (target) this._handleRedirectResult(target)
    }
    if (!this._redirectResult) {
      return
    }
    try {
      await this._redirectResult
      this._settleLogin()
    } catch (err) {
      this._settleLogin(
        err instanceof Error ? err : new Error('Token exchange failed.')
      )
      throw err
    } finally {
      this._redirectResult = null
    }
  }

  /**
   * Returns true if the user is currently authenticated (i.e. an access
   * token is present in the token store).
   */
  async isAuthenticated(): Promise<boolean> {
    return !!(await this.config.tokenStore.getAccessToken())
  }

  /**
   * Returns true if a refresh token is currently stored and a refresh
   * exchange could be attempted.
   */
  async hasRefreshToken(): Promise<boolean> {
    return !!(await this.config.tokenStore.getRefreshToken())
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
    const accessToken = await this.config.tokenStore.getAccessToken()
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
    const refreshToken = await this.config.tokenStore.getRefreshToken()
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
        await this.config.tokenStore.setTokens(
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
    const refreshToken = await this.config.tokenStore.getRefreshToken()
    if (refreshToken) {
      try {
        await fetch(`${this.config.basePath}/oauth/revoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: refreshToken,
            client_id: this.apiKey
          })
        })
      } catch {
        // Per RFC 7009, revocation errors are non-fatal
      }
    }
    await this.config.tokenStore.clear()
    this._clearPkceState()
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
    await this.config.tokenStore.setTokens(
      tokens.access_token,
      tokens.refresh_token
    )
  }

  private _handleRedirectResult(url: string): void {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return
    }

    const queryParams = parsed.searchParams
    const hashParams = new URLSearchParams(
      parsed.hash.startsWith('#') ? parsed.hash.slice(1) : ''
    )

    const code = queryParams.get('code') ?? hashParams.get('code')
    const state = queryParams.get('state') ?? hashParams.get('state')
    const openerOrigin =
      queryParams.get('origin') ?? hashParams.get('origin') ?? parsed.origin

    if (!code || !state) {
      return
    }

    // If running inside a popup (opened by login on the parent page),
    // forward the code + state back to the opener and close. The opener's
    // _receiveMessage handler will do the exchange using its own verifier.
    if (typeof window !== 'undefined' && window.opener) {
      try {
        window.opener.postMessage({ code, state }, openerOrigin)
      } catch {
        // Cannot communicate with opener — fall through to local handling
      }
      window.close()
      return
    }

    // Full-page redirect / mobile — handle the exchange locally
    const codeVerifier = this.pkceVerifier
    if (!codeVerifier) {
      this._settleLogin(
        new Error('OAuth login state was lost. Please try signing in again.')
      )
      return
    }

    // Verify CSRF state
    if (this.csrfToken !== state) {
      this._clearPkceState()
      this._settleLogin(
        new Error(
          'OAuth state mismatch — the login attempt may have been tampered with.'
        )
      )
      return
    }

    const redirectUriForExchange =
      this.pkceRedirectUri ??
      this.config.redirectUri ??
      `${parsed.origin}${parsed.pathname}`

    this._clearPkceState()

    // Remove code/state from the URL to prevent stale bookmarks (web only)
    if (typeof window !== 'undefined' && window.history) {
      try {
        const cleanUrl = new URL(url)
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
    if (this._boundMessageHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this._boundMessageHandler, false)
      this._boundMessageHandler = null
    }
    this._clearPopupCheckInterval()
  }

  private _clearPkceState(): void {
    this._csrfToken = null
    this._pkceVerifier = null
    this._pkceRedirectUri = null
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(CSRF_TOKEN_KEY)
      window.sessionStorage.removeItem(PKCE_VERIFIER_KEY)
      window.sessionStorage.removeItem(PKCE_REDIRECT_URI_KEY)
    }
  }

  private _clearPopupCheckInterval() {
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

      if (this.csrfToken !== event.data.state) {
        this._settleLogin(new Error('State mismatch.'))
        return
      }

      const codeVerifier = this.pkceVerifier
      const storedRedirectUri = this.pkceRedirectUri
      this._clearPkceState()

      if (!codeVerifier) {
        this._settleLogin(new Error('PKCE code verifier not found.'))
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
