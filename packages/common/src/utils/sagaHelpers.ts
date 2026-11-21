import { QueryClient } from '@tanstack/react-query'
import { EventChannel } from 'redux-saga'
import { GetContextEffect } from 'redux-saga/effects'
import { call, getContext, put, select, take } from 'typed-redux-saga'
import { Action } from 'typesafe-actions'

import { getAccountStatusQueryKey } from '~/api/tan-query/users/account/useAccountStatus'
import { waitForReachability } from '~/store/reachability/sagas'
import { toast } from '~/store/ui/toast/slice'

import { Status } from '../models/Status'

const messages = {
  somethingWrong: 'Something went wrong'
}

export function* actionChannelDispatcher(channel: EventChannel<any>) {
  while (true) {
    const action: Action<any> | undefined = yield take(channel)
    if (action) {
      yield put(action)
    }
  }
}

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

export function* waitForRead() {
  yield* call(waitForReachability)
  yield* call(waitForAccount)
}

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
