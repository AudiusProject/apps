import type { DecodedUserToken } from '../api/generated/default'
import { Logger, type LoggerService } from '../services/Logger'
import { isOAuthScopeValid, isWriteOnceParams } from '../utils/oauthScope'

import { generateCodeVerifier, generateCodeChallenge } from './pkce'
import type { OAuthTokenStore } from './tokenStore'
import { OAuthScope, WriteOnceParams, LoginResult } from './types'

export type LoginSuccessCallback = (
  profile: LoginResult['profile'],
  encodedJwt: string
) => void
export type LoginErrorCallback = (errorMessage: string) => void
export type ButtonOptions = Partial<{
  size: 'small' | 'medium' | 'large'
  corners: 'default' | 'pill'
  customText: string
  disableHoverGrow: boolean
  fullWidth: boolean
}>

const CSS = `
.audiusLoginButton {
  cursor: pointer;
  font-family: Helvetica, Arial, sans-serif;
  text-align: center;
  color: #FFFFFF;
  font-weight: 700;
  font-size: 14px;
  line-height: 100%;
  align-items: center;
  display: flex;
  border: 0;
  height: 28px;
  justify-content: center;
  padding: 0px 16px;
  background: #CC0FE0;
  border-radius: 4px;
  transition: all 0.07s ease-in-out;
}

.audiusLoginButton:hover {
  background: #D127E3;
  transform: perspective(1px) scale3d(1.04, 1.04, 1.04);
}

.audiusLoginButton.disableHoverGrow:hover {
  transform: none;
}

.audiusLoginButton:active {
  background: #A30CB3;
}

.audiusLoginButton.pill {
  border-radius: 99px;
}

.audiusLoginButton.fullWidth {
  width: 100%;
}

.audiusLoginButton.small {
  height: 20px;
  font-size: 11px;
  padding: 0px 32px;
}

.audiusLoginButton.large {
  height: 40px;
  font-size: 18px;
  padding: 0px 18px;
}
`
// From https://stackoverflow.com/a/27747377
const generateId = (): string => {
  const arr = new Uint8Array(40 / 2) // Result of function will be 40 chars long
  // @ts-expect-error TS doesn't understand `msCrypto` (which provides compatibility for IE)
  ;(window.crypto || window.msCrypto).getRandomValues(arr)
  return Array.from(arr, function dec2hex(dec) {
    return dec.toString(16).padStart(2, '0')
  }).join('')
}

const generateAudiusLogoSvg = (size: 'small' | 'medium' | 'large') => {
  let height: number
  let paddingRight: number
  if (size === 'small') {
    height = 16
    paddingRight = 5
  } else if (size === 'medium') {
    height = 18
    paddingRight = 5
  } else {
    height = 24
    paddingRight = 10
  }
  return `<svg width="${height}px" height="${height}px" viewBox="0 0 56 48" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="padding-right: ${paddingRight}px;">
<g id="Assets" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
    <g id="assets" transform="translate(-1555.000000, -2588.000000)">
        <g id="audiusLogoGlyph" transform="translate(1555.000000, 2588.000000)">
            <path d="M55.8191698,46.0362519 L42.4551012,23.3458831 L36.1870263,12.7036635 L29.0910326,0.65551431 C28.5766233,-0.217848954 27.2890668,-0.218676884 26.7734944,0.654065432 L13.3787621,23.3270477 L7.90582764,32.5909699 C7.39025522,33.4637122 8.03324043,34.5553386 9.06332791,34.5560631 L19.4031138,34.56279 C19.881044,34.5631005 20.3230236,34.3136864 20.5623059,33.9087249 L25.9362708,24.8122516 L26.7580568,23.4212248 C26.790518,23.3662709 26.8260456,23.3149392 26.8641108,23.2669192 C27.4325516,22.5520012 28.5935412,22.6041608 29.0755951,23.4226737 L34.6514114,32.8894388 L35.682239,34.6396841 C35.7412402,34.7399672 35.7843808,34.8430445 35.813987,34.9470533 C36.0430129,35.7492145 35.4339691,36.6039494 34.5220954,36.6034319 L22.3586676,36.5954631 C21.8806317,36.5951526 21.4387578,36.8445667 21.1994756,37.2496317 L16.0236614,46.0105861 C15.5080889,46.8833284 16.1510741,47.9749548 17.1810559,47.9756793 L27.9002253,47.9827167 L41.2664086,47.9913065 L54.6590261,47.9999997 C55.6892193,48.0006207 56.3335791,46.9096152 55.8191698,46.0362519" id="Audius-Logo" fill="#ffffff" fill-rule="evenodd"></path>
            <rect id="bound" x="0" y="0" width="56" height="48"></rect>
        </g>
    </g>
</g>
</svg>`
}

const CSRF_TOKEN_KEY = 'audiusOauthState'
const PKCE_VERIFIER_KEY = 'audiusPkceCodeVerifier'
const PKCE_REDIRECT_URI_KEY = 'audiusPkceRedirectUri'

type OAuthConfig = {
  appName?: string
  apiKey?: string
  logger?: LoggerService
  tokenStore?: OAuthTokenStore
  basePath?: string
}

export class OAuth {
  activePopupWindow: null | Window
  popupCheckInterval: any | null
  loginSuccessCallback: LoginSuccessCallback | null
  loginErrorCallback: LoginErrorCallback | null
  apiKey: string | null
  logger: LoggerService
  private _currentLoginResolve: ((result: LoginResult) => void) | null = null

  private _currentLoginReject: ((error: Error) => void) | null = null

  private _boundMessageHandler: ((e: MessageEvent) => void) | null = null

  private _redirectResult: Promise<LoginResult> | null = null

  private _redirectChecked = false

  constructor(private readonly config: OAuthConfig) {
    if (typeof window === 'undefined') {
      throw new Error(
        'Audius OAuth SDK functions are only available in browser. Refer to our documentation to learn how to implement Audius OAuth manually: https://docs.audius.co/developers/log-in-with-audius#manual-implementation.'
      )
    }
    this.apiKey = config.apiKey ?? null
    this.activePopupWindow = null
    this.loginSuccessCallback = null
    this.loginErrorCallback = null
    this.popupCheckInterval = null
    this.logger = (config.logger ?? new Logger()).createPrefixedLogger(
      '[oauth]'
    )
  }

  /**
   * @deprecated No longer necessary to call init() before login(). Use loginAsync() which returns a promise, or pass an onSuccess/onError callbacks to login().
   */
  init({
    successCallback,
    errorCallback
  }: {
    successCallback: LoginSuccessCallback
    errorCallback?: LoginErrorCallback
  }) {
    this.loginSuccessCallback = successCallback
    this.loginErrorCallback = errorCallback ?? null
  }

  login({
    scope = 'read',
    params,
    redirectUri = 'postMessage',
    display = 'popup',
    responseMode = 'fragment',
    onSuccess,
    onError
  }: {
    scope?: OAuthScope
    params?: WriteOnceParams
    redirectUri?: string
    display?: 'popup' | 'fullScreen'
    responseMode?: 'fragment' | 'query'
    onSuccess?: LoginSuccessCallback
    onError?: LoginErrorCallback
  }) {
    this.loginAsync({ scope, params, redirectUri, display, responseMode })
      .then(({ profile, encodedJwt }) => {
        if (onSuccess) {
          onSuccess(profile, encodedJwt)
        } else {
          this.loginSuccessCallback?.(profile, encodedJwt)
        }
      })
      .catch((err: Error) => {
        const errorMessage =
          err instanceof Error ? err.message : 'An unknown error occurred.'
        if (onError) {
          onError(errorMessage)
        } else if (this.loginErrorCallback) {
          this.loginErrorCallback(errorMessage)
        } else {
          this.logger.error(errorMessage)
        }
      })
  }

  async loginAsync({
    scope = 'read',
    params,
    redirectUri = 'postMessage',
    display = 'popup',
    responseMode = 'fragment'
  }: {
    scope?: OAuthScope
    params?: WriteOnceParams
    redirectUri?: string
    display?: 'popup' | 'fullScreen'
    responseMode?: 'fragment' | 'query'
  }): Promise<LoginResult> {
    if (this._currentLoginResolve != null) {
      return Promise.reject(new Error('A login is already in progress.'))
    }

    const promise = new Promise<LoginResult>((resolve, reject) => {
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

    const effectiveScope = scopeFormatted.includes('write')
      ? 'write'
      : scopeFormatted.includes('write_once')
        ? 'write_once'
        : 'read'
    if (effectiveScope === 'write_once' && !isWriteOnceParams(params)) {
      this._settleLogin(new Error('Missing correct params for `oauth.login`.'))
      return promise
    }

    // Determine whether to use PKCE (auto-detect: write scope + apiKey + no apiSecret)
    const usePkce =
      effectiveScope === 'write' &&
      this.apiKey != null &&
      this.config.tokenStore != null &&
      this.config.basePath != null

    const csrfToken = generateId()
    window.sessionStorage.setItem(CSRF_TOKEN_KEY, csrfToken)

    let pkceParams = ''
    if (usePkce) {
      const codeVerifier = generateCodeVerifier()
      window.sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier)
      window.sessionStorage.setItem(PKCE_REDIRECT_URI_KEY, redirectUri)
      try {
        const codeChallenge = await generateCodeChallenge(codeVerifier)
        pkceParams = `&response_type=code&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`
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
    }

    const windowOptions =
      'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=375, height=785, top=100, left=100'
    const originURISafe = encodeURIComponent(window.location.origin)
    const appIdURISafe = encodeURIComponent(
      (this.apiKey || this.config.appName)!
    )

    const writeOnceParams =
      effectiveScope !== 'write_once'
        ? ''
        : `&tx=${encodeURIComponent(params!.tx)}&wallet=${encodeURIComponent(
            params!.wallet
          )}`
    const appIdURIParam = `${
      this.apiKey ? 'api_key' : 'app_name'
    }=${appIdURISafe}`
    const responseModeParam = `response_mode=${responseMode}`

    if (!this.config.basePath) {
      this._settleLogin(
        new Error(
          'OAuth configuration error: basePath is not set. Please provide a valid basePath before calling loginAsync.'
        )
      )
      return promise
    }
    const fullOauthUrl = `${
      this.config.basePath
    }/oauth/authorize?scope=${effectiveScope}&state=${csrfToken}&redirect_uri=${redirectUri}&origin=${originURISafe}&${responseModeParam}&${appIdURIParam}${writeOnceParams}${pkceParams}&display=${display}`

    if (display === 'popup') {
      // Register the message listener lazily so it is scoped to this login session
      if (!this._boundMessageHandler) {
        this._boundMessageHandler = (e: MessageEvent) => this._receiveMessage(e)
        window.addEventListener('message', this._boundMessageHandler, false)
      }
      this.activePopupWindow = window.open(fullOauthUrl, '', windowOptions)
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

  renderButton({
    element,
    scope = 'read',
    buttonOptions
  }: {
    element: HTMLElement
    scope?: OAuthScope
    buttonOptions?: ButtonOptions
  }) {
    if (!element) {
      this.logger.error('Target element for Audius OAuth button is empty.')
    }
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    const button = document.createElement('button')
    button.id = 'audius-login-button'
    button.classList.add('audiusLoginButton')
    if (buttonOptions?.corners === 'pill') {
      button.classList.add('pill')
    }
    if (buttonOptions?.size === 'small') {
      button.classList.add('small')
    }
    if (buttonOptions?.size === 'large') {
      button.classList.add('large')
    }
    if (buttonOptions?.fullWidth) {
      button.classList.add('fullWidth')
    }
    if (buttonOptions?.disableHoverGrow) {
      button.classList.add('disableHoverGrow')
    }
    button.innerHTML = `${generateAudiusLogoSvg(
      buttonOptions?.size ?? 'medium'
    )} ${buttonOptions?.customText ?? 'Continue With Audius'}`
    button.onclick = () => {
      this.login({ scope })
    }
    element.replaceWith(button)
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
    // Lightweight URL check — no side effects
    const queryParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(
      window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : ''
    )
    const code = queryParams.get('code') ?? hashParams.get('code')
    const state = queryParams.get('state') ?? hashParams.get('state')
    return !!(code && state)
  }

  /**
   * If the current page was loaded as the result of an OAuth redirect
   * (i.e. the URL contains `code` and `state` params from the authorization
   * server), this method returns a promise that resolves with the
   * `LoginResult` once the token exchange completes.
   *
   * Returns `null` if no redirect is pending.
   *
   * The result can only be consumed once — subsequent calls return `null`.
   *
   * If running inside a popup (`window.opener` exists), this forwards the
   * authorization code to the opener window via `postMessage` and closes
   * the popup — the opener's `loginAsync` promise resolves with the result.
   * In that case, this method returns `null`.
   */
  async getRedirectResult(): Promise<LoginResult | null> {
    if (!this._redirectChecked) {
      this._redirectChecked = true
      this._handleRedirectResult()
    }
    if (!this._redirectResult) {
      return null
    }
    try {
      return await this._redirectResult
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
   * Refresh the access token using the stored refresh token.
   * Updates the token store on success.
   * Returns the new access token, or `null` if refresh failed.
   */
  async refreshAccessToken(): Promise<string | null> {
    if (!this.config.tokenStore || !this.config.basePath) {
      this.logger.error(
        'Token store and basePath are required for token refresh.'
      )
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
   * Revoke the current refresh token server-side, clear all stored tokens
   * and PKCE session state. After this call, all API instances revert to
   * unauthenticated.
   */
  async logout(): Promise<void> {
    if (this.config.tokenStore?.refreshToken && this.config.basePath) {
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
   * Exchange an authorization code + PKCE verifier for tokens, store them,
   * fetch the user profile, and return a `LoginResult`.
   *
   * Shared by the popup `_receiveMessage` handler and `_detectRedirectResult`.
   */
  private async _exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<LoginResult> {
    if (!this.config.basePath) {
      throw new Error(
        'basePath is required in SDK configuration for PKCE token exchange.'
      )
    }

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

    const meRes = await fetch(`${this.config.basePath}/oauth/me`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    })
    if (!meRes.ok) {
      throw new Error('Failed to fetch user profile.')
    }
    const profile = (await meRes.json()) as DecodedUserToken

    return { profile, encodedJwt: tokens.access_token }
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
    // Parse both query and fragment (responseMode can be either)
    const queryParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(
      window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : ''
    )

    const code = queryParams.get('code') ?? hashParams.get('code')
    const state = queryParams.get('state') ?? hashParams.get('state')

    if (!code || !state) {
      return
    }

    // If running inside a popup (opened by loginAsync on the parent page),
    // forward the code + state back to the opener and close. The opener's
    // _receiveMessage handler will do the exchange using its own verifier.
    if (window.opener) {
      try {
        window.opener.postMessage({ code, state }, window.location.origin)
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
      // Clean up to avoid leaving stale session keys around
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

    // Eagerly start the token exchange
    this._redirectResult = this._exchangeCodeForTokens(
      code,
      codeVerifier,
      storedRedirectUri ?? window.location.origin
    ).catch((err) => {
      this.logger.error(
        'OAuth redirect token exchange failed:',
        err instanceof Error ? err.message : err
      )
      throw err
    })
  }

  private _settleLogin(resultOrError: LoginResult | Error) {
    if (resultOrError instanceof Error) {
      this._currentLoginReject?.(resultOrError)
    } else {
      this._currentLoginResolve?.(resultOrError)
    }
    this._currentLoginResolve = null
    this._currentLoginReject = null
    // Deregister the message listener now that the login has settled
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

    // PKCE flow — consent screen posts { state, code }
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
      // Clean up PKCE session state
      window.sessionStorage.removeItem(PKCE_VERIFIER_KEY)
      window.sessionStorage.removeItem(PKCE_REDIRECT_URI_KEY)

      if (!codeVerifier) {
        this._settleLogin(
          new Error('PKCE code verifier not found in session storage.')
        )
        return
      }

      try {
        const result = await this._exchangeCodeForTokens(
          event.data.code,
          codeVerifier,
          storedRedirectUri ?? 'postMessage'
        )
        this._settleLogin(result)
      } catch (e) {
        this._settleLogin(
          e instanceof Error ? e : new Error('Token exchange failed.')
        )
      }
      return
    }

    // Implicit flow — consent screen posts { state, token }
    if (event.data.token) {
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
      // Verify token and decode
      if (!this.config.basePath) {
        this._settleLogin(
          new Error('basePath is required for token verification.')
        )
        return
      }
      try {
        const verifyRes = await fetch(
          `${this.config.basePath}/users/verify_token?token=${encodeURIComponent(event.data.token)}`
        )
        if (!verifyRes.ok) {
          this._settleLogin(new Error('The token was invalid.'))
          return
        }
        const decoded = (await verifyRes.json()) as {
          data?: DecodedUserToken
        }
        if (decoded?.data) {
          this._settleLogin({
            profile: decoded.data,
            encodedJwt: event.data.token
          })
        } else {
          this._settleLogin(new Error('The token was invalid.'))
        }
      } catch {
        this._settleLogin(new Error('Token verification request failed.'))
      }
      return
    }

    this._settleLogin(new Error('Received message with unknown format.'))
  }
}
