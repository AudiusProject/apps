import { useState } from 'react'

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
import { RateCtaReminder } from 'app/components/rate-cta-drawer/RateCtaReminder'
import { Toasts } from 'app/components/toasts'
import { incrementSessionCount } from 'app/hooks/useSessionCount'
import { RootScreen } from 'app/screens/root-screen'
import {
  localStorage,
  localStoragePreloadPromise
} from 'app/services/local-storage'
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

// Tracks completion of the AsyncStorage preload kicked off at module load.
// Set to true synchronously if the promise has already resolved by the time
// React boots, so we never gate when there's nothing to wait on.
let localStoragePreloaded = false
localStoragePreloadPromise.then(
  () => {
    localStoragePreloaded = true
  },
  () => {
    localStoragePreloaded = true
  }
)

const App = () => {
  const [preloaded, setPreloaded] = useState(localStoragePreloaded)

  useEffectOnce(() => {
    subscribeToNetworkStatusUpdates()
    TrackPlayer.setupPlayer({ autoHandleInterruptions: true })
    if (!localStoragePreloaded) {
      localStoragePreloadPromise.then(
        () => setPreloaded(true),
        () => setPreloaded(true)
      )
    }
  })

  // Wait for the cached account/user to land in the sync cache before
  // rendering. Without this gate, useCurrentAccount.placeholderData returns
  // null on first render and we briefly flash the sign-on screen for a
  // logged-in user. Native splash stays up during this short wait.
  if (!preloaded) return null

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
