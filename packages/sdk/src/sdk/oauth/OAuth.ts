import type { DecodedUserToken, UsersApi } from '../api/generated/default'
import type { LoggerService } from '../services/Logger'
import { isOAuthScopeValid, isWriteOnceParams } from '../utils/oauthScope'
import { parseParams } from '../utils/parseParams'

import {
  OAuthScope,
  IsWriteAccessGrantedSchema,
  IsWriteAccessGrantedRequest,
  WriteOnceParams,
  OAuthEnv,
  OAUTH_URL
} from './types'

export type LoginSuccessCallback = (
  profile: DecodedUserToken,
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

type OAuthConfig = {
  appName?: string
  apiKey?: string
  usersApi: UsersApi
  logger: LoggerService
}

export class OAuth {
  activePopupWindow: null | Window
  popupCheckInterval: any | null
  loginSuccessCallback: LoginSuccessCallback | null
  loginErrorCallback: LoginErrorCallback | null
  apiKey: string | null
  env: OAuthEnv = 'production'
  logger: LoggerService

  constructor(private readonly config: OAuthConfig) {
    if (typeof window === 'undefined') {
      throw new Error(
        'Audius OAuth SDK functions are only available in browser. Refer to our documentation to learn how to implement Audius OAuth manually: https://docs.audius.org/developers/log-in-with-audius#manual-implementation.'
      )
    }
    this.apiKey = config.apiKey ?? null
    this.activePopupWindow = null
    this.loginSuccessCallback = null
    this.loginErrorCallback = null
    this.popupCheckInterval = null
    this.logger = config.logger.createPrefixedLogger('[oauth]')
  }

  init({
    successCallback,
    errorCallback,
    env = 'production'
  }: {
    successCallback: LoginSuccessCallback
    errorCallback?: LoginErrorCallback
    env?: OAuthEnv
  }) {
    this.loginSuccessCallback = successCallback
    this.loginErrorCallback = errorCallback ?? null
    this.env = env
    window.addEventListener(
      'message',
      (e: MessageEvent) => {
        this._receiveMessage(e)
      },
      false
    )
  }

  async isWriteAccessGranted(params: IsWriteAccessGrantedRequest) {
    const { userId, apiKey } = await parseParams(
      'isWriteAccessGranted',
      IsWriteAccessGrantedSchema
    )(params)
    if (!this.apiKey && !apiKey) {
      this._surfaceError(
        'Need to init Audius SDK with API key or pass in API Key directly to oauth.isWriteAccessGranted.'
      )
    }
    const authorizedApps = await this.config.usersApi.getAuthorizedApps({
      id: userId
    })

    const foundIndex = authorizedApps.data?.findIndex(
      (a) =>
        a.address.toLowerCase() ===
        `0x${(apiKey || this.apiKey)!.toLowerCase()}`
    )
    return foundIndex !== undefined && foundIndex > -1
  }

  login({
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
  }) {
    const scopeFormatted = typeof scope === 'string' ? [scope] : scope
    if (!this.config.appName && !this.apiKey) {
      this._surfaceError('App name not set (set with `init` method).')
      return
    }
    if (scopeFormatted.includes('write') && !this.apiKey) {
      this._surfaceError(
        "The 'write' scope requires Audius SDK to be initialized with an API key"
      )
    }
    if (!this.loginSuccessCallback) {
      this._surfaceError(
        'Login success callback not set (set with `init` method).'
      )
      return
    }
    if (!isOAuthScopeValid(scopeFormatted)) {
      this._surfaceError('Scope must be `read` or `write`.')
      return
    }

    const effectiveScope = scopeFormatted.includes('write')
      ? 'write'
      : scopeFormatted.includes('write_once')
        ? 'write_once'
        : 'read'
    if (effectiveScope === 'write_once' && !isWriteOnceParams(params)) {
      this._surfaceError('Missing correct params for `oauth.login`.')
      return
    }

    const csrfToken = generateId()
    window.localStorage.setItem(CSRF_TOKEN_KEY, csrfToken)
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
      OAUTH_URL[this.env]
    }?scope=${effectiveScope}&state=${csrfToken}&redirect_uri=${redirectUri}&origin=${originURISafe}&${responseModeParam}&${appIdURIParam}${writeOnceParams}&display=${display}`

    if (redirectUri === 'postMessage') {
      this.activePopupWindow = window.open(fullOauthUrl, '', windowOptions)
      this._clearPopupCheckInterval()
      this.popupCheckInterval = setInterval(() => {
        if (this.activePopupWindow?.closed) {
          this._surfaceError('The login popup was closed prematurely.')
          if (this.popupCheckInterval) {
            clearInterval(this.popupCheckInterval)
          }
        }
      }, 500)
    } else {
      window.location.href = fullOauthUrl
    }
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

  /**
   * Verify if the given jwt ID token was signed by the subject (user) in the payload
   * @deprecated see `UsersApi.verifyIDToken`
   * @param token the token to verify
   * @returns
   */
  async verifyToken(token: string) {
    return await this.config.usersApi.verifyIDToken({ token })
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

  _clearPopupCheckInterval() {
    if (this.popupCheckInterval) {
      clearInterval(this.popupCheckInterval)
    }
  }

  async _receiveMessage(event: MessageEvent) {
    const oauthOrigin = new URL(OAUTH_URL[this.env]).origin
    if (
      event.origin !== oauthOrigin ||
      event.source !== this.activePopupWindow ||
      !event.data.state ||
      !event.data.token
    ) {
      return
    }
    this._clearPopupCheckInterval()
    if (this.activePopupWindow) {
      if (!this.activePopupWindow.closed) {
        this.activePopupWindow.close()
      }
      this.activePopupWindow = null
    }
    if (this.getCsrfToken() !== event.data.state) {
      this._surfaceError('State mismatch.')
    }
    // Verify token and decode
    const decodedJwt = await this.verifyToken(event.data.token)
    if (decodedJwt?.data) {
      if (this.loginSuccessCallback) {
        this.loginSuccessCallback(decodedJwt.data, event.data.token)
      }
    } else {
      this._surfaceError('The token was invalid.')
    }
  }
}
