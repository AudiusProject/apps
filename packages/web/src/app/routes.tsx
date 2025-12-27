import React, { lazy, Suspense, useEffect } from 'react'

import { SyncLocalStorageUserProvider } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { CoinflowPurchaseProtection } from '@coinflowlabs/react'
import type { RouteObject } from 'react-router'
import { Navigate, Outlet, useNavigate } from 'react-router'

import { RouterContextProvider } from 'components/animated-switch/RouterContextProvider'
import { HeaderContextProvider } from 'components/header/mobile/HeaderContextProvider'
import { NavProvider } from 'components/nav/mobile/NavContext'
import { ScrollProvider } from 'components/scroll-provider/ScrollProvider'
import { ToastContextProvider } from 'components/toast/ToastContext'
import { MainContentContextProvider } from 'pages/MainContentContext'
import { SomethingWrong } from 'pages/something-wrong/SomethingWrong'
import { env } from 'services/env'
import { localStorage } from 'services/local-storage'
import { setNavigateRef } from 'store/navigationMiddleware'

import { AppContextProvider } from './AppContextProvider'
import { AppErrorBoundary } from './AppErrorBoundary'
import { AudiusQueryProvider } from './AudiusQueryProvider'
import { ThemeProvider } from './ThemeProvider'
import WebPlayer from './web-player/WebPlayer'

const {
  PRIVATE_KEY_EXPORTER_SETTINGS_PAGE,
  SIGN_IN_PAGE,
  SIGN_ON_ALIASES,
  SIGN_UP_PAGE
} = route

// Lazy load pages for code splitting
const SignOnPage = lazy(() => import('pages/sign-on-page'))
const OAuthLoginPage = lazy(() => import('pages/oauth-login-page'))
const OAuthPayPage = lazy(() => import('pages/oauth-pay-page'))
const PrivateKeyExporterPage = lazy(
  () => import('pages/private-key-exporter-page/PrivateKeyExporterPage')
)
const PrivateKeyExporterModal = lazy(
  () => import('pages/private-key-exporter-page/PrivateKeyExporterModal')
)
const AppModal = lazy(() => import('pages/modals/AppModal'))

const MERCHANT_ID = env.COINFLOW_MERCHANT_ID
const IS_PRODUCTION = env.ENVIRONMENT === 'production'

// Component to set up navigation ref for middleware (must be inside router context)
const NavigationSetup = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate()

  useEffect(() => {
    setNavigateRef(navigate as any)
    return () => {
      setNavigateRef(null as any)
    }
  }, [navigate])

  return <>{children}</>
}

// Root layout component that wraps all routes with providers
const RootLayout = () => {
  return (
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
                          <SomethingWrong />
                          <Suspense fallback={null}>
                            <CoinflowPurchaseProtection
                              merchantId={MERCHANT_ID || ''}
                              coinflowEnv={IS_PRODUCTION ? 'prod' : 'sandbox'}
                            />
                            <Outlet />
                          </Suspense>
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
  )
}

// Create routes configuration
export const createRoutes = (): RouteObject[] => {
  return [
    {
      element: <RootLayout />,
      children: [
        // Sign-on alias redirects
        ...SIGN_ON_ALIASES.map((alias) => ({
          path: alias,
          element: <Navigate to={SIGN_IN_PAGE} replace />
        })),
        // Sign in routes
        {
          path: SIGN_IN_PAGE,
          children: [
            {
              index: true,
              element: <SignOnPage />
            },
            {
              path: '*',
              element: <SignOnPage />
            }
          ]
        },
        // Sign up routes
        {
          path: SIGN_UP_PAGE,
          children: [
            {
              index: true,
              element: <SignOnPage />
            },
            {
              path: '*',
              element: <SignOnPage />
            }
          ]
        },
        // OAuth routes
        {
          path: '/oauth/auth/pay',
          element: <OAuthPayPage />
        },
        {
          path: '/oauth/pay',
          element: <OAuthPayPage />
        },
        {
          path: '/oauth/auth',
          element: <OAuthLoginPage />
        },
        // Private key exporter routes
        {
          path: PRIVATE_KEY_EXPORTER_SETTINGS_PAGE,
          children: [
            {
              index: true,
              element: (
                <>
                  <PrivateKeyExporterPage />
                  <AppModal
                    key='PrivateKeyExporter'
                    name='PrivateKeyExporter'
                    modal={PrivateKeyExporterModal}
                  />
                </>
              )
            },
            {
              path: '*',
              element: (
                <>
                  <PrivateKeyExporterPage />
                  <AppModal
                    key='PrivateKeyExporter'
                    name='PrivateKeyExporter'
                    modal={PrivateKeyExporterModal}
                  />
                </>
              )
            }
          ]
        },
        // Catch-all route for WebPlayer
        {
          path: '*',
          element: (
            <AppErrorBoundary>
              <WebPlayer />
            </AppErrorBoundary>
          )
        }
      ]
    }
  ]
}
