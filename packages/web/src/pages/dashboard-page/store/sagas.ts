import {
  transformAndCleanList,
  userCollectionMetadataFromSDK
} from '@audius/common/adapters'
import {
  primeCollectionDataSaga,
  queryAccountUser,
  queryCurrentUserId
} from '@audius/common/api'
import { Track } from '@audius/common/models'
import { getContext, getSDK } from '@audius/common/store'
import { dayjs, Dayjs, route } from '@audius/common/utils'
import { Id, OptionalId } from '@audius/sdk'
import { each } from 'lodash'
import { all, call, put, takeEvery } from 'typed-redux-saga'

import { retrieveUserTracks } from 'common/store/pages/profile/lineups/tracks/retrieveUserTracks'
import { requiresAccount } from 'common/utils/requiresAccount'
import { waitForRead } from 'utils/sagaHelpers'

import { actions as dashboardActions } from './slice'
import ArtistDashboardState from './types'

const { DASHBOARD_PAGE } = route

const formatMonth = (date: Dayjs | string) =>
  dayjs.utc(date).format('MMM').toUpperCase()

function* fetchDashboardTracksAsync(
  action: ReturnType<typeof dashboardActions.fetchTracks>
) {
  const accountUserId = yield* call(queryCurrentUserId)
  const accountUser = yield* call(queryAccountUser)
  const accountHandle = accountUser?.handle
  const { offset, limit } = action.payload

  try {
    if (!accountHandle || !accountUserId) {
      yield* put(dashboardActions.fetchTracksFailed({}))
      return
    }
    const tracks = yield* call(retrieveUserTracks, {
      handle: accountHandle,
      currentUserId: accountUserId,
      offset,
      limit,
      getUnlisted: true
    })
    yield put(dashboardActions.fetchTracksSucceeded({ tracks }))
  } catch (error) {
    console.error(error)
    yield put(dashboardActions.fetchTracksFailed({}))
  }
}

function* fetchDashboardAsync(
  action: ReturnType<typeof dashboardActions.fetch>
) {
  yield* call(waitForRead)

  const accountUser = yield* call(queryAccountUser)
  const accountHandle = accountUser?.handle
  const accountUserId = yield* call(queryCurrentUserId)
  if (!accountUserId) {
    yield* put(dashboardActions.fetchFailed({}))
    return
  }

  const sdk = yield* getSDK()
  const { offset, limit } = action.payload
  try {
    if (!accountHandle) {
      yield* put(dashboardActions.fetchFailed({}))
      return
    }
    const data = yield* all([
      call(retrieveUserTracks, {
        handle: accountHandle,
        currentUserId: accountUserId,
        offset,
        limit,
        getUnlisted: true
      }),
      call([sdk.users, sdk.users.getPlaylistsByUser], {
        id: Id.parse(accountUserId),
        userId: OptionalId.parse(accountUserId)
      }),
      call([sdk.users, sdk.users.getAlbumsByUser], {
        id: Id.parse(accountUserId),
        userId: OptionalId.parse(accountUserId)
      })
    ])
    const tracks = data[0] as Track[]
    const playlists = transformAndCleanList(
      (data[1] as Awaited<ReturnType<typeof sdk.users.getPlaylistsByUser>>)
        .data,
      userCollectionMetadataFromSDK
    )
    const albums = transformAndCleanList(
      (data[2] as Awaited<ReturnType<typeof sdk.users.getAlbumsByUser>>).data,
      userCollectionMetadataFromSDK
    )
    const collections = [...playlists, ...albums]
    yield* call(primeCollectionDataSaga, [...playlists, ...albums])

    const trackIds = tracks.map((t) => t.track_id)
    const now = dayjs()

    yield* put(
      dashboardActions.fetchListenData({
        trackIds,
        start: now.subtract(1, 'year').toISOString(),
        end: now.toISOString(),
        period: 'month'
      })
    )

    if (tracks.length > 0 || playlists.length > 0) {
      yield* put(
        dashboardActions.fetchSucceeded({
          tracks,
          collections
        })
      )
    } else {
      yield* put(dashboardActions.fetchFailed({}))
    }
  } catch (error) {
    console.error(error)
    yield* put(dashboardActions.fetchFailed({}))
  }
}

function* fetchDashboardListenDataAsync(
  action: ReturnType<typeof dashboardActions.fetchListenData>
) {
  const { start, end } = action.payload
  const audiusSdk = yield* getContext('audiusSdk')
  const sdk = yield* call(audiusSdk)
  const accountUserId = yield* call(queryCurrentUserId)
  const { data: listenData } = yield* call(
    [sdk.users, sdk.users.getUserMonthlyTrackListens],
    {
      id: Id.parse(accountUserId),
      startTime: start,
      endTime: end
    }
  )
  const labels: string[] = []
  const labelIndexMap: { [key: string]: number } = {}
  let startDate = dayjs.utc(start)
  const endDate = dayjs.utc(end)
  while (startDate.isBefore(endDate)) {
    startDate = startDate.add(1, 'month').endOf('month')
    const label = formatMonth(startDate)
    labelIndexMap[label] = labels.length
    labels.push(label)
  }

  const formattedListenData: ArtistDashboardState['listenData'] = {
    all: {
      labels: [...labels],
      values: new Array(labels.length).fill(0)
    }
  }
  each(listenData, (data, date) => {
    const index = labelIndexMap[formatMonth(date)]
    formattedListenData.all.values[index] = data.totalListens ?? 0
    if (data.listenCounts) {
      data.listenCounts.forEach((count) => {
        if (count.trackId && !(count.trackId in formattedListenData)) {
          formattedListenData[count.trackId] = {
            labels: [...labels],
            values: new Array(labels.length).fill(0)
          }
        }
        if (count.trackId) {
          formattedListenData[count.trackId].values[index] = count.listens ?? 0
        }
      })
    }
  })

  if (listenData) {
    yield* put(
      dashboardActions.fetchListenDataSucceeded({
        listenData: formattedListenData
      })
    )
  } else {
    yield* put(dashboardActions.fetchListenDataFailed({}))
  }
}

function* watchFetchDashboardTracks() {
  yield takeEvery(
    dashboardActions.fetchTracks,
    requiresAccount(fetchDashboardTracksAsync, DASHBOARD_PAGE)
  )
}

function* watchFetchDashboard() {
  yield* takeEvery(
    dashboardActions.fetch.type,
    requiresAccount(fetchDashboardAsync, DASHBOARD_PAGE)
  )
}

function* watchFetchDashboardListenData() {
  yield* takeEvery(
    dashboardActions.fetchListenData.type,
    fetchDashboardListenDataAsync
  )
}

export default function sagas() {
  return [
    watchFetchDashboard,
    watchFetchDashboardTracks,
    watchFetchDashboardListenData
  ]
}
