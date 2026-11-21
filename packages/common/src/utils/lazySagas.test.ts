import { applyMiddleware, createStore, type Action } from 'redux'
import createSagaMiddleware, { stdChannel } from 'redux-saga'
import { all, put, spawn, takeEvery } from 'redux-saga/effects'
import { describe, expect, it, vi } from 'vitest'

import { lazySagas } from './lazySagas'

const TRIGGER = 'feature/trigger'
const OTHER = 'feature/other'
const DONE = 'feature/done'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const setup = ({
  eager,
  withChannel = true,
  load
}: {
  eager?: boolean
  withChannel?: boolean
  load?: () => Promise<any>
}) => {
  const reduced: string[] = []
  const handled: string[] = []
  const reducer = (state = null, action: Action) => {
    if (action.type === TRIGGER || action.type === OTHER) {
      reduced.push(action.type)
    }
    return state
  }

  function* watchTrigger() {
    yield takeEvery([TRIGGER, OTHER], function* (action: Action) {
      handled.push(action.type)
      yield put({ type: DONE })
    })
  }
  const module = { default: () => [watchTrigger] }
  let resolveLoad: (() => void) | undefined
  const loader = vi.fn(
    load ??
      (() =>
        new Promise((resolve) => {
          resolveLoad = () => resolve(module)
        }))
  )

  const channel = stdChannel<Action>()
  const sagaMiddleware = createSagaMiddleware({
    channel,
    context: withChannel ? { sagaChannel: channel } : {}
  })
  const store = createStore(reducer, applyMiddleware(sagaMiddleware))
  sagaMiddleware.run(function* () {
    yield all([
      spawn(
        lazySagas({ pattern: [TRIGGER, OTHER], load: loader, eager }) as any
      )
    ])
  })
  return {
    store,
    loader,
    reduced,
    handled,
    resolveLoad: async () => {
      resolveLoad?.()
      await flushPromises()
    }
  }
}

describe('lazySagas', () => {
  it('does not load until a matching action is dispatched', async () => {
    const { store, loader } = setup({})
    store.dispatch({ type: 'unrelated' })
    await flushPromises()
    expect(loader).not.toHaveBeenCalled()
    store.dispatch({ type: TRIGGER })
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('replays the trigger and queued actions to the loaded sagas once, without re-running reducers', async () => {
    const { store, loader, reduced, handled, resolveLoad } = setup({})
    store.dispatch({ type: TRIGGER })
    store.dispatch({ type: OTHER })
    await resolveLoad()

    expect(handled).toEqual([TRIGGER, OTHER])
    expect(reduced).toEqual([TRIGGER, OTHER])

    store.dispatch({ type: TRIGGER })
    expect(handled).toEqual([TRIGGER, OTHER, TRIGGER])
    expect(reduced).toEqual([TRIGGER, OTHER, TRIGGER])
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('loads right away when eager', async () => {
    const { store, loader, handled, resolveLoad } = setup({ eager: true })
    expect(loader).toHaveBeenCalledTimes(1)
    store.dispatch({ type: OTHER })
    await resolveLoad()
    expect(handled).toEqual([OTHER])
  })

  it('falls back to re-dispatching without a saga channel in context', async () => {
    const { store, reduced, handled, resolveLoad } = setup({
      withChannel: false
    })
    store.dispatch({ type: TRIGGER })
    await resolveLoad()
    expect(handled).toEqual([TRIGGER])
    expect(reduced).toEqual([TRIGGER, TRIGGER])
  })

  it('retries the load on the next matching action after a failure', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    let attempts = 0
    const { store, loader, handled } = setup({
      load: async () => {
        attempts += 1
        if (attempts === 1) throw new Error('chunk failed')
        return {
          default: () => [
            function* () {
              yield takeEvery(TRIGGER, function* () {
                handled.push(TRIGGER)
              })
            }
          ]
        }
      }
    })
    store.dispatch({ type: TRIGGER })
    await flushPromises()
    expect(handled).toEqual([])
    store.dispatch({ type: TRIGGER })
    await flushPromises()
    expect(loader).toHaveBeenCalledTimes(2)
    expect(handled).toEqual([TRIGGER])
    consoleError.mockRestore()
  })
})
