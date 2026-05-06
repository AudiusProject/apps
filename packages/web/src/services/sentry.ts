import { DoubleKeys } from '@audius/common/services'

import packageJson from '../../package.json'

import { env } from './env'
import { remoteConfigInstance } from './remote-config/remote-config-instance'
const { version: appVersion } = packageJson

const analyticsBlacklist = [
  'google-analytics',
  'stats.g',
  'fullstory',
  'amplitude',
  'mixpanel',
  'mouseflow'
]

const MAX_BREADCRUMBS = 300

// Noisy, non-actionable error patterns we don't want clogging Sentry.
// Each entry is matched against the event's error message and exception value.
const NOISY_ERROR_PATTERNS: RegExp[] = [
  // Code-splitting / dynamic import failures. Almost always a stale deploy or
  // flaky network — not a real bug we can fix in code.
  /ChunkLoadError/i,
  /Loading chunk [\w-]+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  // ResizeObserver loop warnings. Browsers fire these spuriously and they
  // don't represent real errors — ignored by all major frameworks.
  /ResizeObserver loop limit exceeded/i,
  /ResizeObserver loop completed with undelivered notifications/i,
  // Aborted fetches. Caused by user navigation or component unmount, not bugs.
  /AbortError/i,
  /The user aborted a request/i,
  // Generic network failures — user offline, captive portal, ad blocker, etc.
  /Failed to fetch/i,
  /NetworkError/i,
  /Load failed/i,
  /The network connection was lost/i,
  // Browser permission denials (mic, camera, clipboard, notifications) —
  // expected user choices, not bugs.
  /NotAllowedError/i
]

let sentryInitialized = false
let sentryInitPromise: Promise<void> | null = null

/**
 * Lazy-load and initialize Sentry SDK
 */
export const initializeSentry = async () => {
  // Return existing promise if initialization is already in progress
  if (sentryInitPromise) {
    return sentryInitPromise
  }

  // Return immediately if already initialized
  if (sentryInitialized) {
    return
  }

  sentryInitPromise = (async () => {
    try {
      await remoteConfigInstance.waitForRemoteConfig()

      // Lazy load Sentry SDK
      const Sentry = await import('@sentry/browser')

      Sentry.init({
        dsn: env.SENTRY_DSN,
        transport: Sentry.makeBrowserOfflineTransport(
          Sentry.makeFetchTransport
        ),
        ignoreErrors:
          process.env.VITE_SENTRY_DISABLED === 'true' ? [/.*/] : undefined,

        // Use our semantic release version for release tracking
        release: appVersion,

        integrations: [
          // Pull extra fields off error objects
          Sentry.extraErrorDataIntegration(),
          // Capture a session recording
          Sentry.replayIntegration({})
        ],

        normalizeDepth: 5,
        maxBreadcrumbs: MAX_BREADCRUMBS,
        beforeSend: (event, hint) => {
          const exception = event.exception?.values?.[0]
          const message =
            (typeof hint?.originalException === 'object' &&
            hint?.originalException !== null &&
            'message' in hint.originalException
              ? String(
                  (hint.originalException as { message?: unknown }).message ??
                    ''
                )
              : '') ||
            exception?.value ||
            event.message ||
            ''
          const stack = exception?.stacktrace?.frames?.length ?? 0

          // Drop known-noisy error patterns (chunk load, ResizeObserver,
          // network/abort, permission denials). See NOISY_ERROR_PATTERNS above
          // for the full rationale.
          if (NOISY_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
            if (env.ENVIRONMENT !== 'production') {
              console.warn('[sentry] dropped noisy error:', message)
            }
            return null
          }

          // Drop unhandled rejections / exceptions that have no stack and
          // either an empty message or a message too short to be actionable
          // (e.g. "true", "null", "Error"). These are almost always thrown
          // non-Error values from third-party scripts.
          if (stack === 0 && message.trim().length < 10) {
            if (env.ENVIRONMENT !== 'production') {
              console.warn(
                '[sentry] dropped low-signal error (no stack, short message):',
                JSON.stringify(message)
              )
            }
            return null
          }

          return event
        },
        beforeBreadcrumb: (breadCrumb, hint) => {
          // filter out info and debug logs
          if (
            (breadCrumb.level === 'info' || breadCrumb.level === 'debug') &&
            breadCrumb.category === 'console'
          ) {
            return null
          }
          // filter out analytics events
          if (hint && hint.xhr) {
            const url = hint.xhr.__sentry_xhr_v3__.url
            const isAnalyticsRequest = analyticsBlacklist.some(
              (term) => url.search(term) !== -1
            )
            if (isAnalyticsRequest) {
              return null
            }
          }
          return breadCrumb
        },
        // This is the sample rate for healthy sessions without errors - set to 0 since we only care about errors
        replaysSessionSampleRate: 0,
        // This is a sample rate specific to when errors occur. We want to see 100% of them
        replaysOnErrorSampleRate: Number(
          remoteConfigInstance.getRemoteVar(
            DoubleKeys.SENTRY_REPLAY_ERROR_SAMPLE_RATE
          ) ?? 0
        )
      })

      Sentry.setTag('commit_sha', process.env.VITE_CURRENT_GIT_SHA)
      Sentry.setTag('platform', 'web')

      sentryInitialized = true
    } catch (err) {
      console.error('Failed to initialize Sentry:', err)
      sentryInitPromise = null
      throw err
    }
  })()

  return sentryInitPromise
}

/**
 * Get Sentry SDK instance, initializing if necessary
 */
export const getSentry = async () => {
  await initializeSentry()
  return import('@sentry/browser')
}
