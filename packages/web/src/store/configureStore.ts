import { Name, ErrorLevel } from '@audius/common/models'
import { chatMiddleware } from '@audius/common/store'
import { composeWithDevToolsLogOnlyInProduction } from '@redux-devtools/extension'
import { createStore, applyMiddleware, Action, Store } from 'redux'
import { persistStore } from 'redux-persist'
import createSagaMiddleware from 'redux-saga'
import thunk from 'redux-thunk'
import { PartialDeep } from 'type-fest'

import { audiusSdk } from 'services/audius-sdk'
import { queryClient } from 'services/query-client'
import * as errorActions from 'store/errors/actions'
import { reportToSentry } from 'store/errors/reportToSentry'
import createRootReducer from 'store/reducers'
import rootSaga, { testRootSaga } from 'store/sagas'

import { navigationMiddleware } from './navigationMiddleware'
import { buildStoreContext } from './storeContext'
import { AppState } from './types'

// Lazy load Amplitude track function
const amplitudeTrack = async (
  event: string,
  properties?: Record<string, any>
) => {
  try {
    const { track } = await import('services/analytics/amplitude')
    await track(event, properties)
  } catch (err) {
    console.error('Failed to track event in Amplitude:', err)
  }
}

declare global {
  interface Window {
    store: Store<RootState>
  }
}

type StoreType = ReturnType<typeof configureStore>['store']
type RootState = ReturnType<StoreType['getState']>

// Can't send up the entire Redux state b/c it's too fat
// for Sentry to handle, and there is sensitive data
const statePruner = (state: AppState) => {
  const currentProfileHandle = state.pages.profile.currentUser ?? ''
  const currentProfile = state.pages.profile.entries[currentProfileHandle] ?? {}

  return {
    account: {
      status: state.account.status,
      userId: state.account.userId,
      reason: state.account.reason
    },
    pages: {
      profile: {
        handle: currentProfile.handle,
        status: currentProfile.status,
        updateError: currentProfile.updateError,
        updateSuccess: currentProfile.updateSuccess,
        updating: currentProfile.updating,
        userId: currentProfile.userId
      }
    },
    // Router state removed - using react-router-dom directly now
    signOn: {
      accountReady: state.signOn.accountReady,
      email: state.signOn.email,
      handle: state.signOn.handle,
      status: state.signOn.status,
      useExternalWallet: state.signOn.usingExternalWallet,
      verified: state.signOn.verified
    },
    upload: {
      completionId: state.upload.completionId,
      failedTrackIndices: state.upload.failedTrackIndices,
      metadata: state.upload.metadata,
      success: state.upload.success,
      tracks: (state.upload.tracks || []).map((t) => ({
        metadata: t.metadata
      })),
      uploading: state.upload.uploading,
      uploadProgress: state.upload.uploadProgress,
      uploadType: state.upload.uploadType
    }
  }
}

// We're not logging any action bodies to prevent us from accidentally
// logging sensitive information in the future if additional actions are added.
// If we discover we want specific action bodies in the future for Sentry
// debuggability, those should be whitelisted here.
const actionSanitizer = (action: Action) => ({ type: action.type })

// Lazy-load Sentry middleware wrapper
// This creates a middleware that lazy-loads the actual Sentry SDK and middleware
type SentryMiddlewareFactory = (
  store: any
) => (next: any) => (action: Action) => any
let sentryMiddlewareFactory: SentryMiddlewareFactory | null = null
let sentryMiddlewarePromise: Promise<SentryMiddlewareFactory | null> | null =
  null

const createLazySentryMiddleware = () => {
  return (store: any) => {
    let sentryNext: ((action: Action) => any) | null = null

    return (next: any) => (action: Action) => {
      // Lazy load Sentry middleware on first action
      if (!sentryMiddlewareFactory && !sentryMiddlewarePromise) {
        sentryMiddlewarePromise = (async () => {
          try {
            const [Sentry, createSentryMiddleware] = await Promise.all([
              import('@sentry/browser'),
              import('redux-sentry-middleware')
            ])

            const middleware = createSentryMiddleware.default(
              {
                configureScope: Sentry.configureScope,
                addBreadcrumb: Sentry.addBreadcrumb
              } as any,
              {
                actionTransformer: actionSanitizer,
                stateTransformer: statePruner
              }
            )

            sentryMiddlewareFactory = middleware
            return sentryMiddlewareFactory
          } catch (err) {
            console.error('Failed to load Sentry middleware:', err)
            sentryMiddlewarePromise = null
            return null
          }
        })()
      }

      // If middleware is already loaded, use it
      if (sentryMiddlewareFactory) {
        if (!sentryNext) {
          sentryNext = sentryMiddlewareFactory(store)(next)
        }
        return sentryNext(action)
      }

      // If still loading, pass through the action for now
      if (sentryMiddlewarePromise) {
        sentryMiddlewarePromise
          .then((factory) => {
            if (factory) {
              sentryNext = factory(store)(next)
              if (sentryNext) {
                sentryNext(action)
              }
            }
          })
          .catch(() => {
            // Silently fail - just pass through
          })
      }

      return next(action)
    }
  }
}

const sentryMiddleware = createLazySentryMiddleware()

export const configureStore = ({
  isMobile,
  initialStoreState,
  isTest
}: {
  isMobile: boolean
  initialStoreState?: PartialDeep<AppState>
  isTest?: boolean
}) => {
  const onSagaError = (
    error: Error,
    errorInfo: {
      sagaStack: string
    }
  ) => {
    console.error(
      `Caught saga error: ${error} ${JSON.stringify(errorInfo, null, 4)}`
    )
    store.dispatch(
      errorActions.handleError({
        name: 'Caught Saga Error',
        message: error.message,
        shouldRedirect: true
      })
    )
    const additionalInfo = {
      ...errorInfo,
      route: window.location.pathname
    }

    reportToSentry({
      level: ErrorLevel.Fatal,
      error,
      additionalInfo
    })
    // Fire and forget - don't await to avoid blocking error handling
    amplitudeTrack(Name.ERROR_PAGE, additionalInfo).catch((err) => {
      console.error('Failed to track error in Amplitude:', err)
    })
  }

  const context = buildStoreContext({ isMobile, isTest })
  const sagaMiddleware = createSagaMiddleware({
    onError: onSagaError,
    context
  })

  // For tests, only use basic middleware without sagas
  const middlewares = isTest
    ? applyMiddleware(navigationMiddleware, thunk, sagaMiddleware!)
    : applyMiddleware(
        navigationMiddleware,
        chatMiddleware(audiusSdk, queryClient),
        // Don't run sagas serverside
        ...(typeof window !== 'undefined' ? [sagaMiddleware!] : []),
        sentryMiddleware,
        thunk
      )

  const composeEnhancers = composeWithDevToolsLogOnlyInProduction({
    trace: true,
    traceLimit: 25,
    maxAge: 1000
  })

  const store = createStore(
    createRootReducer(),
    // @ts-ignore - Initial state is just for test mocking purposes
    initialStoreState,
    composeEnhancers(middlewares)
  )
  context.dispatch = store.dispatch

  // Don't run sagas in tests - we just need the store
  if (typeof window !== 'undefined' && sagaMiddleware && !isTest) {
    sagaMiddleware.run(rootSaga)
  }

  const persistor = persistStore(store)

  return { store, persistor }
}
