import { MouseEventHandler } from 'react'

import 'whatwg-fetch'
import 'url-search-params-polyfill'

import { TwitterProfile } from '@audius/common/store'
import { SocialButton } from '@audius/harmony'

import { audiusBackendInstance } from 'services/audius-backend/audius-backend-instance'
const REQUEST_TOKEN_URL =
  `${audiusBackendInstance.identityServiceUrl}/twitter` as const
const LOGIN_URL =
  `${audiusBackendInstance.identityServiceUrl}/twitter/callback` as const

type XAuthButtonProps = {
  className?: string
  credentials?: 'omit' | 'same-origin' | 'include'
  customHeaders?: Record<string, any>
  dialogHeight?: number
  dialogWidth?: number
  forceLogin?: boolean
  onClick?: () => void
  onFailure: (error: any) => void
  onSuccess: (uuid: string, profile: TwitterProfile) => void
  screenName?: string
  children?: string
}

export const XAuthButton = (props: XAuthButtonProps) => {
  const {
    className,
    credentials = 'same-origin',
    customHeaders,
    dialogHeight = 400,
    dialogWidth = 600,
    forceLogin = false,
    onClick,
    onFailure,
    onSuccess,
    screenName,
    children
  } = props

  const onButtonClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault()
    onClick?.()
    return getRequestToken()
  }

  const getHeaders = () => {
    return { ...customHeaders, 'Content-Type': 'application/json' }
  }

  const getRequestToken = () => {
    const popup = openPopup()
    let authenticationUrl: string

    return window
      .fetch(REQUEST_TOKEN_URL, {
        method: 'POST',
        credentials,
        headers: getHeaders()
      })
      .then((response) => {
        return response.json()
      })
      .then((data) => {
        authenticationUrl = `https://api.x.com/oauth/authenticate?oauth_token=${data.oauth_token}&force_login=${forceLogin}`

        if (screenName) {
          authenticationUrl = `${authenticationUrl}&screen_name=${screenName}`
        }

        if (popup) {
          popup.location = authenticationUrl
          polling(popup)
        }
      })
      .catch((error) => {
        popup?.close()
        console.error(
          'Sign Up: Twitter getRequestToken popup failed',
          error as Error
        )
        return onFailure(error)
      })
  }

  const openPopup = () => {
    const w = dialogWidth
    const h = dialogHeight

    return window.open(
      '',
      '',
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${w}, height=${h}`
    )
  }

  const polling = (popup: Window) => {
    const pollingInterval = setInterval(() => {
      if (!popup || popup.closed || popup.closed === undefined) {
        clearInterval(pollingInterval)
        onFailure(new Error('Popup has been closed by user'))
        return
      }

      const closeDialog = () => {
        clearInterval(pollingInterval)
        popup.close()
      }
      try {
        if (
          !popup.location.hostname.includes('api.twitter.com') &&
          popup.location.hostname !== ''
        ) {
          if (popup.location.search) {
            const query = new URLSearchParams(popup.location.search)

            const oauthToken = query.get('oauth_token')
            const oauthVerifier = query.get('oauth_verifier')
            if (oauthToken === null || oauthVerifier === null) return
            closeDialog()
            return getOauthToken(oauthVerifier, oauthToken)
          } else {
            closeDialog()
            const error = new Error(
              'OAuth redirect has occurred but no query or hash parameters were found. ' +
                'They were either not set during the redirect, or were removed—typically by a ' +
                'routing library—before Twitter react component could read it.'
            )
            console.error(error)
            return onFailure(error)
          }
        }
      } catch (error) {
        // Ignore DOMException: Blocked a frame with origin from accessing a cross-origin frame.
        // A hack to get around same-origin security policy errors in IE.
      }
    }, 500)
  }

  const getOauthToken = (oAuthVerifier: string, oauthToken: string) => {
    return window
      .fetch(
        `${LOGIN_URL}?oauth_verifier=${oAuthVerifier}&oauth_token=${oauthToken}`,
        {
          method: 'POST',
          credentials,
          headers: getHeaders()
        }
      )
      .then((response) => {
        if (!response.ok) {
          response.json().then((json) => onFailure(json.error))
        }
        response.json().then(({ uuid, profile }) => onSuccess(uuid, profile))
      })
      .catch((error) => {
        console.error('Sign Up: Twitter getOauthToken failed', error as Error)
        return onFailure(error)
      })
  }

  return (
    <SocialButton socialType='x' onClick={onButtonClick} className={className}>
      {children}
    </SocialButton>
  )
}
