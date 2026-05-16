import {
  call,
  takeEvery,
  put,
  select,
  delay,
  fork,
  cancel,
  FixedTask
} from 'typed-redux-saga'

import { Name } from '~/models/Analytics'
import { IdentityRequestError } from '~/services/auth/identity'
import { getContext } from '~/store/effects'

import { setVisibility } from '../modals/parentSlice'
import { toast } from '../toast/slice'

import { reportStripeFlowAnalytics } from './sagaHelpers'
import { getStripeModalState } from './selectors'
import {
  cancelStripeOnramp,
  initializeStripeModal,
  stripeSessionCreated,
  stripeSessionStatusChanged
} from './slice'
import {
  StripeSessionCreationError,
  StripeSessionCreationErrorResponseData
} from './types'

const STRIPE_TAKING_A_WHILE_DELAY = 60 * 1000

const messages = {
  stripeTakingAWhile:
    'Stripe is taking longer than expected... Thanks for your patience!'
}

function* handleInitializeStripeModal({
  payload: { amount, destinationCurrency, destinationWallet }
}: ReturnType<typeof initializeStripeModal>) {
  const identityService = yield* getContext('identityService')
  const { track, make } = yield* getContext('analytics')
  const { onrampFailed } = yield* select(getStripeModalState)
  try {
    const res = yield* call(
      [identityService, identityService.createStripeSession],
      {
        amount,
        destinationCurrency,
        destinationWallet
      }
    )
    yield* put(stripeSessionCreated({ clientSecret: res.client_secret }))
    yield* call(
      track,
      make({
        eventName: Name.STRIPE_SESSION_CREATED,
        amount,
        destinationCurrency
      })
    )
  } catch (e) {
    const {
      code,
      message: stripeErrorMessage,
      type
    } = ((e as IdentityRequestError).response?.data ??
      {}) as StripeSessionCreationErrorResponseData

    const error = new StripeSessionCreationError(code, stripeErrorMessage, type)

    if (onrampFailed) {
      yield* put({
        type: onrampFailed.type,
        payload: { error }
      })
    }
    yield* put(setVisibility({ modal: 'StripeOnRamp', visible: 'closing' }))
    console.error('Stripe session creation error', error, {
      code,
      stripeErrorMessage,
      type,
      amount,
      destinationCurrency
    })
    yield* call(
      track,
      make({
        eventName: Name.STRIPE_SESSION_CREATION_ERROR,
        amount,
        code,
        destinationCurrency,
        stripeErrorMessage,
        kind: type
      })
    )
  }
}

let stripeTakingAWhileToastTask: FixedTask<any> | null = null

function* toastStripeTakingAWhile() {
  if (stripeTakingAWhileToastTask) return
  yield* delay(STRIPE_TAKING_A_WHILE_DELAY)
  yield put(toast({ content: messages.stripeTakingAWhile }))
}

function* handleStripeSessionChanged({
  payload: { session }
}: ReturnType<typeof stripeSessionStatusChanged>) {
  const { onrampSucceeded, previousStripeSessionData } =
    yield* select(getStripeModalState)

  if (session.status === 'fulfillment_processing') {
    stripeTakingAWhileToastTask = yield* fork(toastStripeTakingAWhile)
  }
  if (session.status === 'fulfillment_complete') {
    if (stripeTakingAWhileToastTask) {
      yield* cancel(stripeTakingAWhileToastTask)
      stripeTakingAWhileToastTask = null
    }

    if (onrampSucceeded) {
      yield* put({ ...onrampSucceeded })
    }
    yield* put(setVisibility({ modal: 'StripeOnRamp', visible: 'closing' }))
  }
  yield* call(reportStripeFlowAnalytics, session, previousStripeSessionData)
}

function* handleCancelStripeOnramp() {
  const { onrampCanceled } = yield* select(getStripeModalState)
  yield* put(setVisibility({ modal: 'StripeOnRamp', visible: 'closing' }))

  if (onrampCanceled) {
    yield* put({ ...onrampCanceled })
  }
}

function* watchInitializeStripeModal() {
  yield takeEvery(initializeStripeModal, handleInitializeStripeModal)
}

function* watchStripeSessionChanged() {
  yield takeEvery(stripeSessionStatusChanged, handleStripeSessionChanged)
}

function* watchCancelStripeOnramp() {
  yield takeEvery(cancelStripeOnramp, handleCancelStripeOnramp)
}

export default function sagas() {
  return [
    watchInitializeStripeModal,
    watchStripeSessionChanged,
    watchCancelStripeOnramp
  ]
}
