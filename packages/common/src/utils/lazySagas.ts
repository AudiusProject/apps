import type { Action } from 'redux'
import { buffers } from 'redux-saga'
import type { MulticastChannel } from 'redux-saga'
import type { ActionPattern } from 'redux-saga/effects'
import {
  actionChannel,
  all,
  call,
  flush,
  getContext,
  put,
  spawn,
  take
} from 'typed-redux-saga'

import { sagaWithErrorHandler } from './sagaHelpers'

type SagaList = Array<() => Generator<any, void, any>>

type LazySagasConfig = {
  pattern: ActionPattern
  load: () => Promise<{ default: () => SagaList }>
  eager?: boolean
}

export const SAGA_CHANNEL_CONTEXT_KEY = 'sagaChannel'

export const lazySagas = ({ pattern, load, eager }: LazySagasConfig) => {
  function* lazySagaLoader() {
    const pending = yield* actionChannel(pattern, buffers.expanding<Action>())
    let first: Action | null = eager ? null : yield* take(pending)

    let sagas: SagaList
    while (true) {
      try {
        const module = yield* call(load)
        sagas = module.default()
        break
      } catch (e) {
        console.error('Failed to load sagas', e)
        yield* flush(pending)
        first = yield* take(pending)
      }
    }

    const queued = yield* flush(pending)
    pending.close()

    yield* all(sagas.map((saga) => spawn(sagaWithErrorHandler, saga)))

    const channel = (yield* getContext(SAGA_CHANNEL_CONTEXT_KEY)) as
      | MulticastChannel<Action>
      | undefined
    for (const action of first ? [first, ...queued] : queued) {
      if (channel) {
        yield* put(channel, action)
      } else {
        yield* put(action)
      }
    }
  }
  return lazySagaLoader
}
