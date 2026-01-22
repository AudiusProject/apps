import {
  queryAccountUser,
  queryCurrentUserId,
  queryTrackByUid
} from '@audius/common/api'
import { Kind } from '@audius/common/models'
import {
  profilePageTracksLineupActions as tracksActions,
  cacheTracksActions,
  profilePageTracksLineupActions as lineupActions,
  profilePageSelectors,
  TracksSortMode,
  tracksSocialActions
} from '@audius/common/store'
import { call, select, takeEvery, put } from 'redux-saga/effects'

import { LineupSagas } from 'common/store/lineup/sagas'
import { waitForRead } from 'utils/sagaHelpers'

import { retrieveUserTracks } from './retrieveUserTracks'
import { watchUploadTracksSaga } from './watchUploadTracksSaga'

const { SET_ARTIST_PICK } = tracksSocialActions
const { getProfileTracksLineup, getTrackSource } = profilePageSelectors
const { DELETE_TRACK_REQUESTED } = cacheTracksActions
const PREFIX = tracksActions.prefix

function* getTracks({ offset, limit, payload, handle }) {
  yield waitForRead()
  if (!handle) {
    return []
  }
  const currentUserId = yield call(queryCurrentUserId)
  const profileHandle = handle.toLowerCase()

  const sort = payload?.sort === TracksSortMode.POPULAR ? 'plays' : 'date'
  const getUnlisted = true

  const processed = yield call(retrieveUserTracks, {
    handle: profileHandle,
    currentUserId,
    sort,
    limit,
    offset,
    getUnlisted
  })
  return processed
}

class TracksSagas extends LineupSagas {
  constructor() {
    super(
      PREFIX,
      tracksActions,
      getProfileTracksLineup,
      getTracks,
      undefined,
      undefined,
      getTrackSource
    )
  }
}

function* watchSetArtistPick() {
  yield takeEvery(SET_ARTIST_PICK, function* (action) {
    const accountUser = yield call(queryAccountUser)
    const accountHandle = accountUser?.handle
    const lineup = yield select((state) =>
      getProfileTracksLineup(state, accountHandle)
    )
    const updatedOrderUid = []
    for (const [entryUid, order] of Object.entries(lineup.order)) {
      const track = yield queryTrackByUid(entryUid)
      const isArtistPick = track.track_id === action.trackId

      if (isArtistPick) updatedOrderUid.push({ uid: entryUid, order: 0 })
      else updatedOrderUid.push({ uid: entryUid, order: order + 1 })
    }
    updatedOrderUid.sort((a, b) => a.order - b.order)
    const updatedLineupOrder = updatedOrderUid.map(({ uid }) => uid)

    yield put(
      lineupActions.updateLineupOrder(updatedLineupOrder, accountHandle)
    )
  })
}

function* watchDeleteTrackRequested() {
  yield takeEvery(DELETE_TRACK_REQUESTED, function* (action) {
    const { trackId } = action
    const accountUser = yield call(queryAccountUser)
    const accountHandle = accountUser?.handle
    const lineup = yield select((state) =>
      getProfileTracksLineup(state, accountHandle)
    )
    const trackLineupEntry = lineup.entries.find(
      (entry) => entry.id === trackId
    )
    if (trackLineupEntry) {
      yield put(
        tracksActions.remove(Kind.TRACKS, trackLineupEntry.uid, accountHandle)
      )
    }
  })
}

export default function sagas() {
  const trackSagas = new TracksSagas().getSagas()
  return trackSagas.concat([
    watchSetArtistPick,
    watchDeleteTrackRequested,
    watchUploadTracksSaga
  ])
}
