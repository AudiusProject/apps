import * as Sentry from '@sentry/react-native'

import { env } from 'app/services/env'

import packageJson from '../../package.json'

const { version: appVersion } = packageJson

export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true
})

export const initSentry = () => {
  if (!env.SENTRY_DSN) return

  Sentry.init({
    dsn: env.SENTRY_DSN,
    release: appVersion,
    integrations: [
      navigationIntegration,
      Sentry.reactNativeTracingIntegration()
    ],
    enableUserInteractionTracing: true,
    tracesSampleRate: 0.1,
    ignoreErrors: [
      'Network request failed',
      'Network Error',
      'NetworkError',
      'The Internet connection appears to be offline',
      'No internet connection',
      'Connection lost',
      /timeout.*exceeded/i,
      'AbortError',
      'User cancelled',
      'Login cancelled',
      'cancelled by user',
      'Non-Error promise rejection captured'
    ]
  })
  Sentry.setTag('platform', 'mobile')
  if (process.env.VITE_CURRENT_GIT_SHA) {
    Sentry.setTag('commit_sha', process.env.VITE_CURRENT_GIT_SHA)
  }
}
