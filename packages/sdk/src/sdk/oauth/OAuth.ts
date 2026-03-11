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

    // initialize message listener for receiving login responses from the popup
    window.addEventListener(
      'message',
      (e: MessageEvent) => {
        this._receiveMessage(e)
      },
      false
    )
  }

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
    onSuccess
  }: {
    scope?: OAuthScope
    params?: WriteOnceParams
    redirectUri?: string
    display?: 'popup' | 'fullScreen'
    responseMode?: 'fragment' | 'query'
    onSuccess?: LoginSuccessCallback
  }) {
    if (!this.loginSuccessCallback && !onSuccess) {
      this._surfaceError('Login onSuccess callback not set.')
      return
    }
    this.loginAsync({ scope, params, redirectUri, display, responseMode })
      .then(({ profile, encodedJwt }) => {
        if (onSuccess) {
          onSuccess(profile, encodedJwt)
        } else {
          this.loginSuccessCallback?.(profile, encodedJwt)
        }
      })
      .catch((err: Error) => {
        this._surfaceError(err.message)
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
    window.localStorage.setItem(CSRF_TOKEN_KEY, csrfToken)

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

    const fullOauthUrl = `${
      this.config.basePath
    }/oauth/authorize?scope=${effectiveScope}&state=${csrfToken}&redirect_uri=${redirectUri}&origin=${originURISafe}&${responseModeParam}&${appIdURIParam}${writeOnceParams}${pkceParams}&display=${display}`

    if (redirectUri === 'postMessage') {
      this.activePopupWindow = window.open(fullOauthUrl, '', windowOptions)
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
    return window.localStorage.getItem(CSRF_TOKEN_KEY)
  }

  /* ------- INTERNAL FUNCTIONS ------- */

  _surfaceError(errorMessage: string) {
    if (this.loginErrorCallback) {
      this.loginErrorCallback(errorMessage)
    } else {
      this.logger.error(errorMessage)
    }
  }

  private _settleLogin(resultOrError: LoginResult | Error) {
    if (resultOrError instanceof Error) {
      this._currentLoginReject?.(resultOrError)
    } else {
      this._currentLoginResolve?.(resultOrError)
    }
    this._currentLoginResolve = null
    this._currentLoginReject = null
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

      // Exchange authorization code for tokens
      try {
        const tokenRes = await fetch(`${this.config.basePath}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code: event.data.code,
            code_verifier: codeVerifier,
            client_id: this.apiKey,
            redirect_uri: storedRedirectUri ?? 'postMessage'
          })
        })
        if (!tokenRes.ok) {
          const err = await tokenRes.json().catch(() => ({}))
          this._settleLogin(
            new Error(err.error_description ?? 'Token exchange failed.')
          )
          return
        }
        const tokens = await tokenRes.json()
        this.config.tokenStore?.setTokens(
          tokens.access_token,
          tokens.refresh_token
        )

        // Fetch user profile via /oauth/me
        const meRes = await fetch(`${this.config.basePath}/oauth/me`, {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`
          }
        })
        if (!meRes.ok) {
          this._settleLogin(new Error('Failed to fetch user profile.'))
          return
        }
        const profile = (await meRes.json()) as DecodedUserToken

        this._settleLogin({ profile, encodedJwt: tokens.access_token })
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
      this._surfaceError(
        'Token store and basePath are required for token refresh.'
      )
      return null
    }
    const refreshToken = this.config.tokenStore.refreshToken
    if (!refreshToken) {
      this._surfaceError('No refresh token available.')
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
    window.localStorage.removeItem(CSRF_TOKEN_KEY)
  }
}
