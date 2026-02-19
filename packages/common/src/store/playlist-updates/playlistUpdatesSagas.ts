import { Id, type PlaylistUpdatesResponse } from '@audius/sdk'
import { call, takeEvery, select, put } from 'typed-redux-saga'

import { playlistUpdateFromSDK, transformAndCleanList } from '~/adapters'
import { queryCurrentUserId } from '~/api'

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

  const response = (yield* call(
    [
      sdk.notifications,
      (
        sdk.notifications as {
          getPlaylistUpdates: (params: {
            userId: string
          }) => Promise<PlaylistUpdatesResponse>
        }
      ).getPlaylistUpdates
    ],
    { userId: Id.parse(currentUserId) }
  )) as PlaylistUpdatesResponse | undefined

  const playlistUpdates = transformAndCleanList(
    response?.data?.playlistUpdates ?? [],
    playlistUpdateFromSDK
  )

  if (!playlistUpdates.length) return

  const currentUpdatesTotal = playlistUpdates.length

  if (currentUpdatesTotal !== existingUpdatesTotal) {
    yield* put(playlistUpdatesReceived({ playlistUpdates }))
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
