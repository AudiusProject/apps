import { useCallback, useEffect, useRef, useState } from 'react'

import { useAccountStatus, useCurrentAccountUser } from '@audius/common/api'
import { Status } from '@audius/common/models'
import { AuthHeaders } from '@audius/common/services'
import { route } from '@audius/common/utils'
import { usePlaidLink, PlaidLinkError } from 'react-plaid-link'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router'

import Page from 'components/page/Page'
import { identityService } from 'services/audius-sdk/identity'
import { push as pushRoute } from 'utils/navigation'

import './CheckPage.module.css'

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void
    }
  }
}

const { SIGN_IN_PAGE, SETTINGS_PAGE } = route

const CheckPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { data: accountHandle } = useCurrentAccountUser({
    select: (user) => user?.handle
  })
  const { data: accountStatus } = useAccountStatus()

  useEffect(() => {
    const hasAuthHeaders =
      typeof window !== 'undefined' &&
      window.localStorage &&
      window.localStorage.getItem(AuthHeaders.Message) !== null &&
      window.localStorage.getItem(AuthHeaders.Signature) !== null

    if (accountStatus !== Status.LOADING && !accountHandle && !hasAuthHeaders) {
      dispatch(pushRoute(SIGN_IN_PAGE))
    }
  }, [accountHandle, accountStatus, dispatch])

  const [linkToken, setLinkToken] = useState<string | null>(null)
  const wasSuccessful = useRef(false)

  useEffect(() => {
    async function fetchLinkToken() {
      const { linkToken } = await identityService.createPlaidLinkToken()
      setLinkToken(linkToken)
    }
    fetchLinkToken()
  }, [])

  const isInWebView = useRef(
    typeof window !== 'undefined' && window.ReactNativeWebView !== undefined
  )

  const sendMessageToWebView = useCallback((type: 'success' | 'error') => {
    if (isInWebView.current && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type }))
    }
  }, [])

  const onSuccess = useCallback(() => {
    wasSuccessful.current = true
    if (isInWebView.current) {
      // In WebView, send message instead of navigating
      setTimeout(() => {
        sendMessageToWebView('success')
      }, 500)
    } else {
      // In web, navigate normally
      setTimeout(() => {
        navigate(`${SETTINGS_PAGE}?verification=success`)
      }, 500)
    }
  }, [navigate, sendMessageToWebView])

  const onExit = useCallback(
    (err: PlaidLinkError | null) => {
      if (isInWebView.current) {
        // In WebView, send message instead of navigating
        if (err) {
          sendMessageToWebView('error')
        } else if (wasSuccessful.current) {
          sendMessageToWebView('success')
        } else {
          // User exited without completing - just close
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({ type: 'close' })
            )
          }
        }
      } else {
        // In web, navigate normally
        if (err) {
          navigate(`${SETTINGS_PAGE}?verification=error`)
        } else if (wasSuccessful.current) {
          navigate(`${SETTINGS_PAGE}?verification=success`)
        } else {
          navigate(SETTINGS_PAGE)
        }
      }
    },
    [navigate, sendMessageToWebView]
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit
  })

  useEffect(() => {
    if (ready) {
      const originalWidth = document.body.style.width
      document.body.style.setProperty('width', '100%', 'important')
      open()
      return () => {
        document.body.style.width = originalWidth
      }
    }
  }, [ready, open])

  return <Page title='Verification' description='Audius account verification' />
}

export default CheckPage
