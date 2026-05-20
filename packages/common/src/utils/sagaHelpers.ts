/** Helper Sagas */

import { QueryClient } from '@tanstack/react-query'
import { eventChannel, END, EventChannel } from 'redux-saga'
import { ActionPattern, GetContextEffect } from 'redux-saga/effects'
import {
  all,
  call,
  delay,
  getContext,
  put,
  select,
  spawn,
  take,
  takeEvery
} from 'typed-redux-saga'
import { Action } from 'typesafe-actions'

// this import needs to be very specific for SSR bundlesize
import { getAccountStatusQueryKey } from '~/api/tan-query/users/account/useAccountStatus'
import { waitForReachability } from '~/store/reachability/sagas'
import { toast } from '~/store/ui/toast/slice'

import { Status } from '../models/Status'

const messages = {
  somethingWrong: 'Something went wrong'
}

/**
 * Calls the provided array of calls in batches with delayMs milliseconds between each batch.
 */
export function* batchYield(
  calls: Generator[],
  batchSize: number,
  delayMs: number
) {
  let remainingCalls = calls
  while (remainingCalls.length > 0) {
    yield all(remainingCalls.slice(0, batchSize))
    remainingCalls = remainingCalls.slice(batchSize)
    yield delay(delayMs)
  }
}

/**
 * Takes a channel that yields the value of a Redux action, waits for it to yield and then
 * dispatches the action.
 * @param {Object} channel
 */
export function* actionChannelDispatcher(channel: EventChannel<any>) {
  while (true) {
    const action: Action<any> | undefined = yield take(channel)
    if (action) {
      yield put(action)
    }
  }
}

export function* channelCanceller(
  channel: EventChannel<Action<any>>,
  action: ActionPattern<Action<any>>
) {
  yield take(action)
  channel.close()
}

/**
 * Waits for the selector to return a truthy value.
 * @param {function} selector
 * @param {object} args passed on to the selector
 * @param {(v: any) => bool} customCheck special check to run rather than checking truthy-ness
 *
 * NOTE: Ideally this would have a type parameter for TValue returned from the selector, but
 * typed-redux-saga `call` seems to just throw this away resulting in `unknown` type of the result.
 * Leaving as any for now and can revisit
 */
export function* waitForValue(
  selector: (state: any, selectorArgs?: any) => any,
  args?: any,
  customCheck?: (value: any) => boolean
) {
  let value = yield* select(selector, args)
  while (customCheck ? !customCheck(value) : !value) {
    yield* take()
    value = yield* select(selector, args)
  }
  return value
}

function doEveryImpl(millis: number, times: number | null) {
  return eventChannel((emitter) => {
    // Emit once at the start
    emitter(times || true)

    // Emit once every millis
    const iv = setInterval(() => {
      if (times !== null) {
        times -= 1
      }
      if (times === null || times > 0) {
        emitter(times || true)
      } else {
        emitter(END)
      }
    }, millis)
    return () => {
      clearInterval(iv)
    }
  })
}

/**
 * Waits for a query function to return a truthy value.
 * Similar to waitForValue but for tanstack query data.
 *
 * @template TResult The type of the value returned by the query function
 * @param {function} query A function that returns a Generator that resolves to a value of type TResult
 * @param {any} args Arguments to pass to the query function
 * @param {(v: TResult) => boolean} customCheck special check to run rather than checking truthy-ness
 * @returns {TResult} The value from the query function once it's truthy
 */
export function* waitForQueryValue<TResult>(
  query: (args: any) => Generator<GetContextEffect, TResult | null, any>,
  args?: any,
  customCheck?: (value: TResult) => boolean
) {
  let value: TResult | null = yield* call(query, args)
  while (customCheck ? !customCheck(value as TResult) : !value) {
    yield* take()
    value = yield* call(query, args)
  }
  return value as TResult
}

/**
 * Repeatedly calls a saga/async function on an interval for up to a set number of times.
 * @param {number} millis
 * @param {function *} fn
 * @param {number?} times
 */
export function* doEvery(
  millis: number,
  fn: (...args: any) => any,
  times: number | null = null
) {
  const chan: EventChannel<any> = yield call(doEveryImpl, millis, times)
  yield spawn(function* () {
    yield takeEvery(chan, fn)
  })
  return chan
}

/**
 * Waits for account to finish loading, whether it fails or succeeds.
 */
export function* waitForAccount() {
  const queryClient = (yield* getContext('queryClient')) as QueryClient
  yield* call(
    waitForQueryValue,
    function* () {
      return queryClient.getQueryData(getAccountStatusQueryKey())
    },
    null,
    (status) => status !== Status.LOADING && status !== Status.IDLE
  )
}

/**
 * Required for all reads
 */
export function* waitForRead() {
  yield* call(waitForReachability)
  yield* call(waitForAccount)
}

/**
 * Yields the provided saga, wrapping it in an error
 * boundary that restarts the saga and toasts if it fails.
 * @param saga
 */
export function* sagaWithErrorHandler(saga: () => Generator<any, void, any>) {
  while (true) {
    try {
      yield* call(saga)
      break
    } catch (e) {
      yield* put(toast({ content: messages.somethingWrong }))
      console.error(`Uncaught Saga Error in ${saga.name}`, e)
    }
  }
}
