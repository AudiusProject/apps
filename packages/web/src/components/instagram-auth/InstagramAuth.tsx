import { MouseEvent, ReactNode, useCallback } from 'react'

import cn from 'classnames'

import 'url-search-params-polyfill'
import { audiusBackendInstance } from 'services/audius-backend/audius-backend-instance'
import { env } from 'services/env'
const HOSTNAME = env.PUBLIC_HOSTNAME
const INSTAGRAM_APP_ID = env.INSTAGRAM_APP_ID
const INSTAGRAM_REDIRECT_URL = env.INSTAGRAM_REDIRECT_URL || ''
const INSTAGRAM_AUTHORIZE_URL =
  `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(
    INSTAGRAM_REDIRECT_URL
  )}&scope=user_profile,user_media&response_type=code` as const
const GET_USER_URL =
  `${audiusBackendInstance.identityServiceUrl}/instagram` as const

// Instagram User profile fields to capture
const igUserFields = [
  'id',
  'username',
  'biography',
  'full_name',
  'is_verified',
  'is_private',
  'external_url',
  'business_email',
  'is_business_account',
  'profile_pic_url',
  'profile_pic_url_hd',
  'edge_followed_by',
  'edge_follow'
]

export type InstagramAuthProps = {
  dialogWidth?: number
  dialogHeight?: number
  onClick?: () => void
  onSuccess: (uuid: string, profile: any) => void
  onFailure: (error: any) => void
  style?: object
  disabled?: boolean
  className?: string
  children?: ReactNode
  text?: string
}

const InstagramAuth = ({
  dialogWidth = 400,
  dialogHeight = 740,
  onClick = () => {},
  onSuccess = (uuid: string, profile: any) => {},
  onFailure = () => {},
  style = {},
  disabled = false,
  className,
  children,
  text = 'Sign in with Instagram'
}: InstagramAuthProps) => {
  // Opens a popup window for the instagram authentication
  const openPopup = useCallback(() => {
    return window.open(
      '',
      '',
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${dialogWidth}, height=${dialogHeight}`
    )
  }, [dialogWidth, dialogHeight])

  const getProfile = useCallback(
    async (code: string) => {
      try {
        // Fetch the profile from the graph API
        const profileResp = await window.fetch(GET_USER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        })
        const profileRespJson = await profileResp.json()
        if (!profileRespJson.username) {
          throw new Error(
            profileRespJson.error || 'Unable to fetch information'
          )
        }

        const igUserProfile = igUserFields.reduce((profile: any, field) => {
          profile[field] = profileRespJson[field]
          return profile
        }, {})

        return onSuccess(profileRespJson.username, igUserProfile)
      } catch (err: any) {
        console.error('Sign Up: InstagramAuth getProfile failed', err)
        onFailure(err)
      }
    },
    [onSuccess, onFailure]
  )

  const polling = useCallback(
    (popup: any) => {
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
            popup.location.hostname.includes('audius.co') ||
            popup.location.hostname.includes(HOSTNAME) ||
            popup.location.hostname.includes(window.location.hostname)
          ) {
            if (popup.location.search) {
              const query = new URLSearchParams(popup.location.search)

              const instagramCode = query.get('code')
              if (instagramCode === null) return
              closeDialog()
              return getProfile(instagramCode)
            } else {
              closeDialog()
              const error = new Error(
                'OAuth redirect has occurred but no query or hash parameters were found. ' +
                  'They were either not set during the redirect, or were removed—typically by a ' +
                  'routing library—before Instagram react component could read it.'
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
    },
    [getProfile, onFailure]
  )

  const getRequestToken = useCallback(async () => {
    const popup = openPopup()
    await new Promise((resolve) => setTimeout(resolve, 500)) // wait 500ms
    if (!popup) {
      console.error('Sign Up', new Error('Unable to open InstagramAuth popup'))
    }
    try {
      if (popup) {
        // @ts-ignore
        popup.location = INSTAGRAM_AUTHORIZE_URL
        // @ts-ignore
        polling(popup)
      }
    } catch (error) {
      console.error(
        'Sign Up: InstagramAuth popup polling failed',
        error as Error
      )
      if (popup) popup.close()
      return onFailure(error)
    }
  }, [openPopup, polling, onFailure])

  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault()
      if (onClick) onClick()
      return getRequestToken()
    },
    [onClick, getRequestToken]
  )

  const getDefaultButtonContent = useCallback(() => <span>{text}</span>, [text])

  return (
    <span
      role='button'
      onClick={handleClick}
      style={style}
      className={cn({
        [className!]: !!className,
        disabled: !!disabled
      })}
    >
      {children || getDefaultButtonContent()}
    </span>
  )
}

export default InstagramAuth
