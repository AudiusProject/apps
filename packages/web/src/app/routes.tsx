import React, { lazy, Suspense, useEffect, useState } from 'react'

import { SyncLocalStorageUserProvider, useHasAccount } from '@audius/common/api'
import { route } from '@audius/common/utils'
import NiceModal from '@ebay/nice-modal-react'
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

const CoinflowPurchaseProtection = lazy(() =>
  import('@coinflowlabs/react').then((m) => ({
    default: m.CoinflowPurchaseProtection
  }))
)

const {
  PRIVATE_KEY_EXPORTER_SETTINGS_PAGE,
  SIGN_IN_PAGE,
  SIGN_ON_ALIASES,
  SIGN_UP_PAGE
} = route

const SignOnPage = lazy(() => import('pages/sign-on-page'))
const OAuthLoginPage = lazy(() => import('pages/oauth-login-page'))
const OAuthSignUpPage = lazy(() =>
  import('pages/oauth-login-page/OAuthSignUpPage').then((m) => ({
    default: m.OAuthSignUpPage
  }))
)
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

const DeferredCoinflowPurchaseProtection = () => {
  const hasAccount = useHasAccount()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(() => setReady(true), {
        timeout: 5000
      })
      return () => window.cancelIdleCallback(handle)
    }
    const handle = setTimeout(() => setReady(true), 2000)
    return () => clearTimeout(handle)
  }, [])
  if (!ready || !hasAccount) return null
  return (
    <Suspense fallback={null}>
      <CoinflowPurchaseProtection
        merchantId={MERCHANT_ID || ''}
        coinflowEnv={IS_PRODUCTION ? 'prod' : 'sandbox'}
      />
    </Suspense>
  )
}

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

const RootLayout = () => {
  return (
    <NavigationSetup>
      <RouterContextProvider>
        <HeaderContextProvider>
          <NavProvider>
            <ScrollProvider>
              <AppContextProvider>
                <AudiusQueryProvider>
                  <ThemeProvider>
                    <ToastContextProvider>
                      <MainContentContextProvider>
                        <SyncLocalStorageUserProvider
                          localStorage={localStorage}
                        >
                          {/* NiceModal-managed modals (e.g. ShareModal)
                              read AudiusQueryProvider + ToastContext, so the
                              Provider must mount inside them. */}
                          <NiceModal.Provider>
                            <SomethingWrong />
                            <DeferredCoinflowPurchaseProtection />
                            <Suspense fallback={null}>
                              <Outlet />
                            </Suspense>
                          </NiceModal.Provider>
                        </SyncLocalStorageUserProvider>
                      </MainContentContextProvider>
                    </ToastContextProvider>
                  </ThemeProvider>
                </AudiusQueryProvider>
              </AppContextProvider>
            </ScrollProvider>
          </NavProvider>
        </HeaderContextProvider>
      </RouterContextProvider>
    </NavigationSetup>
  )
}

export const createRoutes = (): RouteObject[] => {
  return [
    {
      element: <RootLayout />,
      children: [
        ...SIGN_ON_ALIASES.map((alias) => ({
          path: alias,
          element: <Navigate to={SIGN_IN_PAGE} replace />
        })),
        {
          path: `${SIGN_IN_PAGE}/*`,
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
        {
          path: `${SIGN_UP_PAGE}/*`,
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
        {
          path: '/oauth/auth/signup/*',
          element: <OAuthSignUpPage />
        },
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
