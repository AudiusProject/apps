import { Name, ErrorLevel } from '@audius/common/models'
import { chatMiddleware } from '@audius/common/store'
import { composeWithDevToolsLogOnlyInProduction } from '@redux-devtools/extension'
import { configureScope, addBreadcrumb } from '@sentry/browser'
import { createStore, applyMiddleware, Action, Store } from 'redux'
import { persistStore } from 'redux-persist'
import createSagaMiddleware from 'redux-saga'
import createSentryMiddleware from 'redux-sentry-middleware'
import thunk from 'redux-thunk'
import { PartialDeep } from 'type-fest'

import { track as amplitudeTrack } from 'services/analytics/amplitude'
import { audiusSdk } from 'services/audius-sdk'
import { queryClient } from 'services/query-client'
import * as errorActions from 'store/errors/actions'
import { reportToSentry } from 'store/errors/reportToSentry'
import createRootReducer from 'store/reducers'
import rootSaga, { testRootSaga } from 'store/sagas'

import { navigationMiddleware } from './navigationMiddleware'
import { buildStoreContext } from './storeContext'
import { AppState } from './types'

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
const sentryMiddleware = createSentryMiddleware(
  { configureScope, addBreadcrumb } as any,
  {
    actionTransformer: actionSanitizer,
    stateTransformer: statePruner
  }
)

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
    amplitudeTrack(Name.ERROR_PAGE, additionalInfo)
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

  if (typeof window !== 'undefined' && sagaMiddleware) {
    sagaMiddleware.run(isTest ? testRootSaga : rootSaga)
  }

  const persistor = persistStore(store)

  return { store, persistor }
}
