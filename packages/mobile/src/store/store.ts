import { ErrorLevel } from '@audius/common/models'
import type { CommonState, RemoteConfigState } from '@audius/common/store'
import {
  chatMiddleware,
  remoteConfigReducer as remoteConfig,
  toastActions,
  reducers as commonReducers
} from '@audius/common/store'
import backend from '@audius/web/src/common/store/backend/reducer'
import type { BackendState } from '@audius/web/src/common/store/backend/types'
import AsyncStorage from '@react-native-async-storage/async-storage'
import signOnReducer from 'common/store/pages/signon/reducer'
import type {
  SignOnPageState,
  SignOnPageReducer
} from 'common/store/pages/signon/types'
import { Platform } from 'react-native'
import RNRestart from 'react-native-restart'
import type { Store } from 'redux'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import { persistStore } from 'redux-persist'
import createSagaMiddleware from 'redux-saga'
import thunk from 'redux-thunk'

import { queryClient } from 'app/services/query-client'
import { audiusSdk } from 'app/services/sdk/audius-sdk'
import { reportToSentry } from 'app/utils/reportToSentry'

import type { DrawersState } from './drawers/slice'
import drawers from './drawers/slice'
import type { KeyboardState } from './keyboard/slice'
import keyboard from './keyboard/slice'
import type { OfflineDownloadsState } from './offline-downloads/slice'
import offlineDownloads from './offline-downloads/slice'
import type { PurchaseVendorState } from './purchase-vendor/slice'
import purchaseVendor from './purchase-vendor/slice'
import rootSaga from './sagas'
import shareToStoryProgress from './share-to-story-progress/slice'
import type { ShareToStoryProgressState } from './share-to-story-progress/slice'
import { storeContext } from './storeContext'
import type { WalletConnectState } from './wallet-connect/slice'
import walletConnect from './wallet-connect/slice'

const errorRestartTimeout = 2000

const { toast } = toastActions

export type AppState = CommonState & {
  // These also belong in CommonState but are here until we move them to the @audius/common package:
  signOn: SignOnPageState
  backend: BackendState

  drawers: DrawersState
  keyboard: KeyboardState
  offlineDownloads: OfflineDownloadsState
  remoteConfig: RemoteConfigState
  walletConnect: WalletConnectState
  shareToStoryProgress: ShareToStoryProgressState
  purchaseVendor: PurchaseVendorState
}

const messages = {
  error: 'Something went wrong'
}

const initializationTime = Date.now()

const onSagaError = (
  error: Error,
  errorInfo: {
    sagaStack: string
  }
) => {
  console.error(
    `Caught saga error: ${error} ${JSON.stringify(errorInfo, null, 4)}`
  )

  dispatch(
    toast({
      content: messages.error,
      type: 'error',
      timeout: errorRestartTimeout
    })
  )

  reportToSentry({
    level: ErrorLevel.Fatal,
    error,
    additionalInfo: errorInfo
  })

  // Automatically restart the app if the session is longer
  // than 30 seconds. Don't want to restart for shorter sessions
  // because it could result in a restart loop
  if (Date.now() - initializationTime > 30000) {
    setTimeout(() => {
      RNRestart.Restart()
    }, errorRestartTimeout)
  }
}

const commonStoreReducers = commonReducers(AsyncStorage)

const rootReducer = combineReducers({
  ...commonStoreReducers,
  // These also belong in common store reducers but are here until we move them to the @audius/common package:
  backend,
  signOn: signOnReducer as unknown as SignOnPageReducer,
  drawers,
  keyboard,
  offlineDownloads,
  remoteConfig,
  walletConnect,
  shareToStoryProgress,
  purchaseVendor
})

const sagaMiddleware = createSagaMiddleware({
  context: storeContext,
  onError: onSagaError
})

const middlewares = [
  sagaMiddleware,
  chatMiddleware(audiusSdk, queryClient),
  thunk
]

const getProdEnhancer = () => {
  return applyMiddleware(...middlewares)
}

const getDevEnhancer = () => {
  const { composeWithDevTools } = require('@redux-devtools/remote')
  const composeEnhancers = composeWithDevTools({
    name: Platform.OS,
    hostname: Platform.select({ ios: 'localhost', android: '10.0.2.2' }),
    port: 8000,
    secure: false,
    realtime: true
  })
  return composeEnhancers(getProdEnhancer())
}

const enhancer = __DEV__ ? getDevEnhancer() : getProdEnhancer()

export const store = createStore(
  rootReducer,
  enhancer
) as unknown as Store<AppState> // need to explicitly type the store for offline-mode store reference
storeContext.dispatch = store.dispatch

export const persistor = persistStore(store)

sagaMiddleware.run(rootSaga)

const { dispatch } = store
export { dispatch }
