import { ReactNode, useState, useMemo } from 'react'

import { MediaProvider } from '@audius/harmony/src/contexts'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Provider as ReduxProvider } from 'react-redux'
import {
  createBrowserRouter,
  createHashRouter,
  RouterProvider
} from 'react-router'
import { PersistGate } from 'redux-persist/integration/react'
import { WagmiProvider } from 'wagmi'

import { useIsMobile } from 'hooks/useIsMobile'
import { env } from 'services/env'
import { queryClient } from 'services/query-client'
import { configureStore } from 'store/configureStore'
import { getSystemAppearance, getTheme } from 'utils/theme/theme'

import { wagmiAdapter } from './ReownAppKitModal'
import { createRoutes } from './routes'

type AppProvidersProps = {
  children?: ReactNode
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

  const basename = env.BASENAME || undefined

  // Create router with data router API for code-splitting and performance
  const router = useMemo(() => {
    const routes = createRoutes()
    const createRouter = env.USE_HASH_ROUTING
      ? createHashRouter
      : createBrowserRouter

    return createRouter(routes, {
      basename
    })
  }, [basename])

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MediaProvider>
          <ReduxProvider store={store}>
            <PersistGate loading={null} persistor={persistor}>
              <RouterProvider router={router} />
            </PersistGate>
          </ReduxProvider>
        </MediaProvider>
        <ReactQueryDevtools />
      </QueryClientProvider>
    </WagmiProvider>
  )
}
