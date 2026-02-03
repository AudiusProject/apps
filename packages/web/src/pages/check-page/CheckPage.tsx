import { useCallback, useEffect, useRef, useState } from 'react'

import { useAccountStatus, useCurrentAccountUser } from '@audius/common/api'
import { Status } from '@audius/common/models'
import { AuthHeaders } from '@audius/common/services'
import { route } from '@audius/common/utils'
import Persona, { Client } from 'persona'
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

  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const personaClientRef = useRef<Client | null>(null)
  const wasSuccessful = useRef(false)

  useEffect(() => {
    async function fetchSessionToken() {
      const { sessionToken } = await identityService.createPersonaSessionToken()
      setSessionToken(sessionToken)
    }
    fetchSessionToken()
  }, [])

  const isInWebView = useRef(
    typeof window !== 'undefined' && window.ReactNativeWebView !== undefined
  )

  const sendMessageToWebView = useCallback((type: 'success' | 'error') => {
    if (isInWebView.current && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type }))
    }
  }, [])

  const onComplete = useCallback(() => {
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

  const onCancel = useCallback(() => {
    if (isInWebView.current) {
      // In WebView, send message instead of navigating
      if (wasSuccessful.current) {
        sendMessageToWebView('success')
      } else {
        // User cancelled without completing - just close
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'close' })
          )
        }
      }
    } else {
      // In web, navigate normally
      if (wasSuccessful.current) {
        navigate(`${SETTINGS_PAGE}?verification=success`)
      } else {
        navigate(SETTINGS_PAGE)
      }
    }
  }, [navigate, sendMessageToWebView])

  const onError = useCallback(() => {
    if (isInWebView.current) {
      // In WebView, send message instead of navigating
      sendMessageToWebView('error')
    } else {
      // In web, navigate normally
      navigate(`${SETTINGS_PAGE}?verification=error`)
    }
  }, [navigate, sendMessageToWebView])

  useEffect(() => {
    if (sessionToken && accountHandle) {
      try {
        const config = JSON.parse(sessionToken)
        const { templateId, referenceId, environmentId } = config

        const originalWidth = document.body.style.width
        document.body.style.setProperty('width', '100%', 'important')

        const client = new Persona.Client({
          templateId,
          referenceId: referenceId ?? accountHandle,
          environmentId,
          onReady: () => {
            client.open()
          },
          onComplete: () => {
            onComplete()
          },
          onCancel: () => {
            onCancel()
          },
          onError: (error) => {
            console.error('Persona error:', error)
            onError()
          }
        })

        personaClientRef.current = client

        return () => {
          document.body.style.width = originalWidth
          if (personaClientRef.current) {
            personaClientRef.current = null
          }
        }
      } catch (error) {
        console.error('Error parsing Persona session token:', error)
        onError()
      }
    }
  }, [sessionToken, accountHandle, onComplete, onCancel, onError])

  return <Page title='Verification' description='Audius account verification' />
}

export default CheckPage
