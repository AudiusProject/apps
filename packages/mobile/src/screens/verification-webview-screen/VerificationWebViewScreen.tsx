import { useCallback, useEffect, useRef, useState } from 'react'

import { useQueryContext } from '@audius/common/api'
import { AuthHeaders } from '@audius/common/services'
import { useNavigation } from '@react-navigation/native'
import { WebView } from 'react-native-webview'
import { WebViewNavigation } from 'react-native-webview/lib/WebViewTypes'

import { env } from 'app/services/env'
import { makeStyles } from 'app/styles'

import { ModalScreen, Screen, ScreenContent } from '../../components/core'
import LoadingSpinner from '../../components/loading-spinner/LoadingSpinner'

const useStyles = makeStyles(() => ({
  root: {
    flex: 1
  },
  webview: {
    flex: 1
  }
}))

type VerificationResult = {
  type: 'success' | 'error' | 'close'
}

const VerificationWebViewScreen = () => {
  const styles = useStyles()
  const navigation = useNavigation()
  const { identityService } = useQueryContext()
  const [authHeaders, setAuthHeaders] = useState<{
    [AuthHeaders.Message]: string
    [AuthHeaders.Signature]: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const webViewRef = useRef<WebView>(null)

  // Fetch auth headers
  useEffect(() => {
    const fetchAuthHeaders = async () => {
      try {
        // Access the private method via the service instance
        // We'll need to expose this or create a public method
        const headers = await (identityService as any)._getSignatureHeaders()
        setAuthHeaders(headers)
      } catch (error) {
        console.error('Failed to fetch auth headers:', error)
      }
    }
    fetchAuthHeaders()
  }, [identityService])

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const result: VerificationResult = JSON.parse(event.nativeEvent.data)
        if (result.type === 'success' || result.type === 'error') {
          // Navigate back and show the result modal
          navigation.goBack()
          // Use a small delay to ensure navigation completes
          setTimeout(() => {
            navigation.navigate('AccountSettingsScreen' as never, {
              verificationResult: result.type
            } as never)
          }, 100)
        } else if (result.type === 'close') {
          navigation.goBack()
        }
      } catch (error) {
        console.error('Failed to parse message from WebView:', error)
      }
    },
    [navigation]
  )

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      // Check if we're navigating away from /check (user completed or exited)
      const url = navState.url
      if (url && !url.includes('/check')) {
        // User navigated away, close the WebView
        console.log('User navigated away from check page')
      }
    },
    []
  )

  const injectedJavaScript = authHeaders
    ? `
      (function() {
        // Store auth headers in localStorage for the web app to use
        localStorage.setItem('${AuthHeaders.Message}', '${authHeaders[AuthHeaders.Message]}');
        localStorage.setItem('${AuthHeaders.Signature}', '${authHeaders[AuthHeaders.Signature]}');
        
        // Override fetch to inject headers
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
          const [url, options = {}] = args;
          const headers = new Headers(options.headers || {});
          headers.set('${AuthHeaders.Message}', '${authHeaders[AuthHeaders.Message]}');
          headers.set('${AuthHeaders.Signature}', '${authHeaders[AuthHeaders.Signature]}');
          return originalFetch(url, { ...options, headers });
        };
      })();
      true;
    `
    : ''

  const checkPageUrl = `${env.AUDIUS_URL}/check`

  if (!authHeaders) {
    return (
      <Screen>
        <ScreenContent>
          <LoadingSpinner />
        </ScreenContent>
      </Screen>
    )
  }

  return (
    <Screen>
      <ScreenContent style={styles.root}>
        <WebView
          ref={webViewRef}
          source={{ uri: checkPageUrl }}
          style={styles.webview}
          injectedJavaScript={injectedJavaScript}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          startInLoadingState={true}
          renderLoading={() => <LoadingSpinner />}
        />
      </ScreenContent>
    </Screen>
  )
}

export const VerificationWebViewModalScreen = () => {
  return (
    <ModalScreen>
      <VerificationWebViewScreen />
    </ModalScreen>
  )
}

