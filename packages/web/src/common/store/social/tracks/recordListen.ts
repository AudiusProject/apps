import { queryCurrentUserId, queryTrack } from '@audius/common/api'
import {
  audioRewardsPageActions,
  tracksSocialActions
} from '@audius/common/store'
import { call, put, takeEvery } from 'typed-redux-saga'

const { updateOptimisticListenStreak, updateOptimisticPlayCount } =
  audioRewardsPageActions

function* recordListen(action: { trackId: number }) {
  const { trackId } = action

  const userId = yield* call(queryCurrentUserId)
  const track = yield* queryTrack(trackId)
  if (!userId || !track) return

  if (userId === track.owner_id && (track.listenCount ?? 0) > 10) {
    return
  }

  // Optimistically update the listen streak if applicable
  yield* put(updateOptimisticListenStreak())

  // Optimistically update the play count if the user is playing their own track
  if (userId === track.owner_id) {
    yield* put(updateOptimisticPlayCount())
  }
}

export function* watchRecordListen() {
  yield* takeEvery(tracksSocialActions.recordListen, recordListen)
}
