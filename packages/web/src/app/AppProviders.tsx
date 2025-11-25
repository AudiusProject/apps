import { ReactNode, useState, useEffect } from 'react'

import { SyncLocalStorageUserProvider } from '@audius/common/api'
import { MediaProvider } from '@audius/harmony/src/contexts'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Provider as ReduxProvider } from 'react-redux'
import { BrowserRouter, HashRouter, useNavigate } from 'react-router-dom'
import { PersistGate } from 'redux-persist/integration/react'
import { WagmiProvider } from 'wagmi'

import { RouterContextProvider } from 'components/animated-switch/RouterContextProvider'
import { HeaderContextProvider } from 'components/header/mobile/HeaderContextProvider'
import { NavProvider } from 'components/nav/mobile/NavContext'
import { ScrollProvider } from 'components/scroll-provider/ScrollProvider'
import { ToastContextProvider } from 'components/toast/ToastContext'
import { useIsMobile } from 'hooks/useIsMobile'
import { MainContentContextProvider } from 'pages/MainContentContext'
import { env } from 'services/env'
import { localStorage } from 'services/local-storage'
import { queryClient } from 'services/query-client'
import { configureStore } from 'store/configureStore'
import { setNavigateRef } from 'store/navigationMiddleware'
import { getSystemAppearance, getTheme } from 'utils/theme/theme'

import { AppContextProvider } from './AppContextProvider'
import { AudiusQueryProvider } from './AudiusQueryProvider'
import { wagmiAdapter } from './ReownAppKitModal'
import { ThemeProvider } from './ThemeProvider'

type AppProvidersProps = {
  children: ReactNode
}

export const AppProviders = ({ children }: AppProvidersProps) => {
  const isMobile = useIsMobile()

  const [{ store, persistor }] = useState(() => {
    const initialStoreState = {
      ui: {
        theme: {
          theme: getTheme(),
          systemAppearance: getSystemAppearance()
        }
      }
    }

    const { store, persistor } = configureStore({ isMobile, initialStoreState })
    // Mount store to window for easy access
    if (typeof window !== 'undefined' && !window.store) {
      window.store = store
    }
    return { store, persistor }
  })

  // Use HashRouter or BrowserRouter based on environment
  const RouterComponent = env.USE_HASH_ROUTING ? HashRouter : BrowserRouter
  const basename = env.BASENAME || undefined

  // Component to set up navigation ref for middleware
  const NavigationSetup = ({ children }: { children: ReactNode }) => {
    const navigate = useNavigate()

    useEffect(() => {
      setNavigateRef(navigate)
      return () => {
        setNavigateRef(null as any)
      }
    }, [navigate])

    return <>{children}</>
  }

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MediaProvider>
          <ReduxProvider store={store}>
            <PersistGate loading={null} persistor={persistor}>
              <RouterComponent basename={basename}>
                <NavigationSetup>
                  <RouterContextProvider>
                    <HeaderContextProvider>
                      <NavProvider>
                        <ScrollProvider>
                          <ThemeProvider>
                            <ToastContextProvider>
                              <AppContextProvider>
                                <AudiusQueryProvider>
                                  <MainContentContextProvider>
                                    <SyncLocalStorageUserProvider
                                      localStorage={localStorage}
                                    >
                                      {children}
                                    </SyncLocalStorageUserProvider>
                                  </MainContentContextProvider>
                                </AudiusQueryProvider>
                              </AppContextProvider>
                            </ToastContextProvider>
                          </ThemeProvider>
                        </ScrollProvider>
                      </NavProvider>
                    </HeaderContextProvider>
                  </RouterContextProvider>
                </NavigationSetup>
              </RouterComponent>
            </PersistGate>
          </ReduxProvider>
        </MediaProvider>
        <ReactQueryDevtools />
      </QueryClientProvider>
    </WagmiProvider>
  )
}
