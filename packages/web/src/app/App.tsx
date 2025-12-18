// @refresh reset
import { Suspense, lazy } from 'react'

import { route } from '@audius/common/utils'
import { CoinflowPurchaseProtection } from '@coinflowlabs/react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AppModal } from 'pages/modals/AppModal'
import { SomethingWrong } from 'pages/something-wrong/SomethingWrong'
import { env } from 'services/env'

import { AppErrorBoundary } from './AppErrorBoundary'
import { AppProviders } from './AppProviders'
import WebPlayer from './web-player/WebPlayer'

const {
  PRIVATE_KEY_EXPORTER_SETTINGS_PAGE,
  SIGN_IN_PAGE,
  SIGN_ON_ALIASES,
  SIGN_UP_PAGE
} = route

const SignOnPage = lazy(() => import('pages/sign-on-page'))
const OAuthLoginPage = lazy(() => import('pages/oauth-login-page'))
const OAuthPayPage = lazy(() => import('pages/oauth-pay-page'))
const PrivateKeyExporterPage = lazy(
  () => import('pages/private-key-exporter-page/PrivateKeyExporterPage')
)
const PrivateKeyExporterModal = lazy(
  () => import('pages/private-key-exporter-page/PrivateKeyExporterModal')
)

const MERCHANT_ID = env.COINFLOW_MERCHANT_ID
const IS_PRODUCTION = env.ENVIRONMENT === 'production'

export const App = () => {
  return (
    <AppProviders>
      <SomethingWrong />
      <Suspense fallback={null}>
        <CoinflowPurchaseProtection
          merchantId={MERCHANT_ID || ''}
          coinflowEnv={IS_PRODUCTION ? 'prod' : 'sandbox'}
        />
        <Routes>
          {SIGN_ON_ALIASES.map((a) => (
            <Route
              key={a}
              path={a}
              element={<Navigate to={SIGN_IN_PAGE} replace />}
            />
          ))}
          <Route path={`${SIGN_IN_PAGE}/*`} element={<SignOnPage />} />
          <Route path={`${SIGN_UP_PAGE}/*`} element={<SignOnPage />} />
          <Route path='/oauth/auth/pay' element={<OAuthPayPage />} />
          <Route path='/oauth/pay' element={<OAuthPayPage />} />
          <Route path='/oauth/auth' element={<OAuthLoginPage />} />
          <Route
            path={`${PRIVATE_KEY_EXPORTER_SETTINGS_PAGE}/*`}
            element={
              <>
                <PrivateKeyExporterPage />
                <AppModal
                  key='PrivateKeyExporter'
                  name='PrivateKeyExporter'
                  modal={PrivateKeyExporterModal}
                />
              </>
            }
          />
          <Route
            path='/*'
            element={
              <AppErrorBoundary>
                <WebPlayer />
              </AppErrorBoundary>
            }
          />
        </Routes>
      </Suspense>
    </AppProviders>
  )
}
