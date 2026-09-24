import { expectSaga } from 'redux-saga-test-plan'
import * as matchers from 'redux-saga-test-plan/matchers'
import { describe, it, vitest } from 'vitest'

import { Name, ShareSource } from '~/models/Analytics'

import { setVisibility } from '../modals/parentSlice'

import sagas from './sagas'
import { requestOpen } from './slice'

describe('share modal sagas', () => {
  it('opens the modal and records what is being shared', async () => {
    const track = vitest.fn()
    const make = vitest.fn((event) => event)
    const [watchRequestOpen] = sagas()

    await expectSaga(watchRequestOpen)
      .provide([[matchers.getContext('analytics'), { track, make }]])
      .dispatch(
        requestOpen({
          type: 'weeklyRotation',
          userId: 7,
          source: ShareSource.PAGE
        })
      )
      .put(setVisibility({ modal: 'Share', visible: true }))
      .call(track, {
        eventName: Name.MODAL_OPENED,
        name: 'Share',
        source: ShareSource.PAGE,
        kind: 'weeklyRotation',
        userId: 7
      })
      .silentRun()
  })
})
