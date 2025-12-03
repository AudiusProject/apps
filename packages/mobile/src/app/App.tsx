import { SyncLocalStorageUserProvider } from '@audius/common/api'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { PortalProvider, PortalHost } from '@gorhom/portal'
import { QueryClientProvider } from '@tanstack/react-query'
import { Platform, UIManager } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import {
  SafeAreaProvider,
  initialWindowMetrics
} from 'react-native-safe-area-context'
import TrackPlayer from 'react-native-track-player'
import { Provider } from 'react-redux'
import { useEffectOnce } from 'react-use'
import { PersistGate } from 'redux-persist/integration/react'

import { CommentDrawerProvider } from 'app/components/comments/CommentDrawerContext'
import NavigationContainer from 'app/components/navigation-container'
import { NotificationReminder } from 'app/components/notification-reminder/NotificationReminder'
import OAuthWebView from 'app/components/oauth/OAuthWebView'
import { RateCtaReminder } from 'app/components/rate-cta-drawer/RateCtaReminder'
import { Toasts } from 'app/components/toasts'
import { incrementSessionCount } from 'app/hooks/useSessionCount'
import { RootScreen } from 'app/screens/root-screen'
import { localStorage } from 'app/services/local-storage'
import { queryClient } from 'app/services/query-client'
import { persistor, store } from 'app/store'
import { subscribeToNetworkStatusUpdates } from 'app/utils/reachability'

import { AppContextProvider } from './AppContextProvider'
import { AudiusQueryProvider } from './AudiusQueryProvider'
import { ConnectivityManager } from './ConnectivityManager'
import { Drawers } from './Drawers'
import ErrorBoundary from './ErrorBoundary'
import { ThemeProvider } from './ThemeProvider'
import { initSentry, navigationIntegration } from './sentry'

initSentry()

const Airplay = Platform.select({
  ios: () => require('../components/audio/Airplay').default,
  android: () => () => null
})?.()

// Need to enable this flag for LayoutAnimation to work on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
  }
}

// Increment the session count when the App.tsx code is first run
incrementSessionCount()

const App = () => {
  useEffectOnce(() => {
    subscribeToNetworkStatusUpdates()
    TrackPlayer.setupPlayer({ autoHandleInterruptions: true })
  })

  return (
    <AppContextProvider>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <KeyboardProvider
          statusBarTranslucent={true}
          navigationBarTranslucent={true}
        >
          <Provider store={store}>
            <AudiusQueryProvider>
              <QueryClientProvider client={queryClient}>
                <SyncLocalStorageUserProvider localStorage={localStorage}>
                  <PersistGate loading={null} persistor={persistor}>
                    <ThemeProvider>
                      <GestureHandlerRootView style={{ flex: 1 }}>
                        <PortalProvider>
                          <ErrorBoundary>
                            <ConnectivityManager />
                            <NavigationContainer
                              navigationIntegration={navigationIntegration}
                            >
                              <BottomSheetModalProvider>
                                <CommentDrawerProvider>
                                  <Toasts />
                                  <Airplay />
                                  <RootScreen />
                                  <Drawers />
                                  <OAuthWebView />
                                  <NotificationReminder />
                                  <RateCtaReminder />
                                  <PortalHost name='ChatReactionsPortal' />
                                </CommentDrawerProvider>
                              </BottomSheetModalProvider>
                              <PortalHost name='DrawerPortal' />
                            </NavigationContainer>
                          </ErrorBoundary>
                        </PortalProvider>
                      </GestureHandlerRootView>
                    </ThemeProvider>
                  </PersistGate>
                </SyncLocalStorageUserProvider>
              </QueryClientProvider>
            </AudiusQueryProvider>
          </Provider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </AppContextProvider>
  )
}

export { App }
