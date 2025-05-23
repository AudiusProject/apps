import { Id } from '@audius/sdk'
import { call, takeEvery, select, put } from 'typed-redux-saga'

import { playlistUpdateFromSDK, transformAndCleanList } from '~/adapters'
import { queryCurrentUserId } from '~/api'
import { Name } from '~/models/Analytics'

import { getSDK } from '../sdkUtils'

import { selectPlaylistUpdatesTotal } from './playlistUpdatesSelectors'
import {
  fetchPlaylistUpdates,
  playlistUpdatesReceived,
  updatedPlaylistViewed
} from './playlistUpdatesSlice'
import { UpdatedPlaylistViewedAction } from './types'

function* watchFetchPlaylistUpdates() {
  yield* takeEvery(fetchPlaylistUpdates, fetchPlaylistUpdatesWorker)
}

function* fetchPlaylistUpdatesWorker() {
  const currentUserId = yield* call(queryCurrentUserId)
  if (!currentUserId) return

  const sdk = yield* getSDK()
  const existingUpdatesTotal = yield* select(selectPlaylistUpdatesTotal)

  const { data } = yield* call(
    [sdk.full.notifications, sdk.full.notifications.getPlaylistUpdates],
    { userId: Id.parse(currentUserId) }
  )

  const playlistUpdates = transformAndCleanList(
    data?.playlistUpdates ?? [],
    playlistUpdateFromSDK
  )

  if (!playlistUpdates.length) return

  const currentUpdatesTotal = playlistUpdates.length

  if (currentUpdatesTotal !== existingUpdatesTotal) {
    yield* put(playlistUpdatesReceived({ playlistUpdates }))
    yield* put({
      type: 'ANALYTICS/TRACK',
      eventName: Name.PLAYLIST_LIBRARY_HAS_UPDATE,
      count: currentUpdatesTotal
    })
  }
}

function* watchUpdatedPlaylistViewedSaga() {
  yield* takeEvery(
    updatedPlaylistViewed.type,
    function* updatePlaylistLastViewedAt(action: UpdatedPlaylistViewedAction) {
      const sdk = yield* getSDK()
      const { playlistId } = action.payload
      const userId = yield* call(queryCurrentUserId)
      if (!userId) return

      yield* call(
        [sdk.notifications, sdk.notifications.updatePlaylistLastViewedAt],
        {
          playlistId: Id.parse(playlistId),
          userId: Id.parse(userId)
        }
      )
    }
  )
}

export default function sagas() {
  return [watchFetchPlaylistUpdates, watchUpdatedPlaylistViewedSaga]
}
