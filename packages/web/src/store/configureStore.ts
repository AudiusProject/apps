import { Name } from '@audius/common/models'
import { chatMiddleware } from '@audius/common/store'
import { composeWithDevToolsLogOnlyInProduction } from '@redux-devtools/extension'
import { createStore, applyMiddleware, Store, Action } from 'redux'
import { persistStore } from 'redux-persist'
import createSagaMiddleware, { stdChannel } from 'redux-saga'
import thunk from 'redux-thunk'
import { PartialDeep } from 'type-fest'

import { audiusSdk } from 'services/audius-sdk'
import { queryClient } from 'services/query-client'
import * as errorActions from 'store/errors/actions'
import createRootReducer from 'store/reducers'
import rootSaga from 'store/sagas'

import { navigationMiddleware } from './navigationMiddleware'
import { buildStoreContext } from './storeContext'
import { AppState } from './types'

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

    amplitudeTrack(Name.ERROR_PAGE, additionalInfo).catch((err) => {
      console.error('Failed to track error in Amplitude:', err)
    })
  }

  const context = buildStoreContext({ isMobile, isTest })
  const sagaChannel = stdChannel<Action>()
  context.sagaChannel = sagaChannel
  const sagaMiddleware = createSagaMiddleware({
    onError: onSagaError,
    context,
    channel: sagaChannel
  })

  const middlewares = isTest
    ? applyMiddleware(navigationMiddleware, thunk, sagaMiddleware!)
    : applyMiddleware(
        navigationMiddleware,
        chatMiddleware(audiusSdk, queryClient),
        ...(typeof window !== 'undefined' ? [sagaMiddleware!] : []),
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

  if (typeof window !== 'undefined' && sagaMiddleware && !isTest) {
    sagaMiddleware.run(rootSaga)
  }

  const persistor = persistStore(store)

  return { store, persistor }
}
