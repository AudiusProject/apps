import { describe, expect, it } from 'vitest'

import { setIdentityAccountReady, signUpTimeout } from './actions'
import reducer from './reducer'

describe('sign-on resumable signup state', () => {
  it('preserves the Identity completion checkpoint for retries', () => {
    const state = reducer(undefined, setIdentityAccountReady())

    expect(state.accountAlreadyExisted).toBe(true)
  })

  it('turns a confirmation timeout into a retryable failure', () => {
    const loadingState = {
      ...reducer(undefined, { type: 'TEST/INIT' }),
      status: 'loading'
    }
    const timeoutAction = signUpTimeout()

    expect(reducer(loadingState, timeoutAction).status).toBe('failure')
    expect(timeoutAction.shouldRedirect).toBe(false)
  })
})
