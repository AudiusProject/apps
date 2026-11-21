import { waitForAccount } from '@audius/common/utils'
import { call } from 'typed-redux-saga'

import { waitForBackendSetup } from 'common/store/backend/sagas'
import {
  waitForConfirmedReachability,
  waitForReachability
} from 'store/reachability/sagas'

export function* waitForWrite() {
  yield* call(waitForBackendSetup)
  yield* call(waitForAccount)
  yield* call(waitForConfirmedReachability)
}

export function* waitForRead() {
  yield* call(waitForReachability)
  yield* call(waitForAccount)
}
