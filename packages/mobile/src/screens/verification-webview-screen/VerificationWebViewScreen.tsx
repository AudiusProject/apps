import { useCallback, useEffect, useRef, useState } from 'react'

import { useQueryContext } from '@audius/common/api'
import { AuthHeaders } from '@audius/common/services'
import { modalsActions } from '@audius/common/store'
import { useNavigation } from '@react-navigation/native'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { useDispatch } from 'react-redux'

import { Flex, LoadingSpinner } from '@audius/harmony-native'
import { makeStyles } from 'app/styles'

import { ModalScreen, Screen, ScreenContent } from '../../components/core'

const useStyles = makeStyles(({ palette }) => ({
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.background
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: palette.background
  }
}))

const { setVisibility } = modalsActions

type VerificationResult = {
  type: 'success' | 'error' | 'close'
}

const VerificationWebViewScreen = () => {
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const dispatch = useDispatch()
  const { identityService } = useQueryContext()
  const [authHeaders, setAuthHeaders] = useState<{
    [AuthHeaders.Message]: string
    [AuthHeaders.Signature]: string
  } | null>(null)
  const webViewRef = useRef<WebView>(null)

  // Fetch auth headers
  useEffect(() => {
    const fetchAuthHeaders = async () => {
      try {
        const headers = await identityService.getAuthHeaders()
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
        if (result.type === 'success') {
          if (webViewRef.current) {
            webViewRef.current.stopLoading()
          }
          setTimeout(() => {
            navigation.goBack()
            dispatch(
              setVisibility({ modal: 'VerificationSuccess', visible: true })
            )
          }, 100)
        } else if (result.type === 'error') {
          if (webViewRef.current) {
            webViewRef.current.stopLoading()
          }
          setTimeout(() => {
            navigation.goBack()
            dispatch(
              setVisibility({ modal: 'VerificationError', visible: true })
            )
          }, 100)
        } else if (result.type === 'close') {
          if (webViewRef.current) {
            webViewRef.current.stopLoading()
          }
          setTimeout(() => {
            navigation.goBack()
          }, 100)
        }
      } catch (error) {
        console.error('Failed to parse message from WebView:', error)
      }
    },
    [navigation, dispatch]
  )

  const injectedJavaScript = authHeaders
    ? `
      (function() {
        // Store auth headers in localStorage for the web app to use
        localStorage.setItem('${AuthHeaders.Message}', '${authHeaders[AuthHeaders.Message]}');
        localStorage.setItem('${AuthHeaders.Signature}', '${authHeaders[AuthHeaders.Signature]}');
      })();
      true;
    `
    : ''

  // const checkPageUrl = `${env.AUDIUS_URL}/check`
  const checkPageUrl = 'http://localhost:3002/check'

  if (!authHeaders) {
    return (
      <Screen>
        <ScreenContent>
          <Flex justifyContent='center' alignItems='center' flex={1}>
            <LoadingSpinner />
          </Flex>
        </ScreenContent>
      </Screen>
    )
  }

  return (
    <Screen>
      <ScreenContent>
        <View style={[styles.webViewContainer, { paddingTop: insets.top }]}>
          <WebView
            ref={webViewRef}
            source={{ uri: checkPageUrl }}
            style={styles.webViewContainer}
            injectedJavaScript={injectedJavaScript}
            injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
            onMessage={handleMessage}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <LoadingSpinner />
              </View>
            )}
          />
        </View>
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
