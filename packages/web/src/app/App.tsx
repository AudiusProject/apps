// @refresh reset
import { Suspense, lazy, useEffect } from 'react'

import { route } from '@audius/common/utils'
import { CoinflowPurchaseProtection } from '@coinflowlabs/react'
import { Redirect, Route, Switch } from 'react-router-dom'

import { AppModal } from 'pages/modals/AppModal'
import { SomethingWrong } from 'pages/something-wrong/SomethingWrong'
import { env } from 'services/env'
import { initWebVitals } from 'services/webVitals'

import { AppErrorBoundary } from './AppErrorBoundary'
import { AppProviders } from './AppProviders'
import { useHistoryContext } from './HistoryProvider'
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
  // TODO: These web vitals events are costly in amplitude, is there a better way to track this with a different tool?
  const { history } = useHistoryContext()

  useEffect(() => {
    if (!IS_PRODUCTION) {
      initWebVitals(history.location)
    }
  }, [history])

  return (
    <AppProviders>
      <SomethingWrong />
      <Suspense fallback={null}>
        <CoinflowPurchaseProtection
          merchantId={MERCHANT_ID || ''}
          coinflowEnv={IS_PRODUCTION ? 'prod' : 'sandbox'}
        />
        <Switch>
          {SIGN_ON_ALIASES.map((a) => (
            <Redirect key={a} from={a} to={SIGN_IN_PAGE} />
          ))}
          <Route path={[SIGN_IN_PAGE, SIGN_UP_PAGE]}>
            <SignOnPage />
          </Route>
          <Route exact path='/oauth/auth'>
            <OAuthLoginPage />
          </Route>
          <Route exact path='/oauth/pay'>
            <OAuthPayPage />
          </Route>
          <Route path={PRIVATE_KEY_EXPORTER_SETTINGS_PAGE}>
            <PrivateKeyExporterPage />
            <AppModal
              key='PrivateKeyExporter'
              name='PrivateKeyExporter'
              modal={PrivateKeyExporterModal}
            />
          </Route>
          <Route path='/'>
            <AppErrorBoundary>
              <WebPlayer />
            </AppErrorBoundary>
          </Route>
        </Switch>
      </Suspense>
    </AppProviders>
  )
}
