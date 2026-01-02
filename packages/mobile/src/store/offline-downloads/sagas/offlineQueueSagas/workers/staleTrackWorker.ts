import { userTrackMetadataFromSDK } from '@audius/common/adapters'
import { queryCurrentUserId, queryTrack } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { getSDK } from '@audius/common/store'
import { dayjs } from '@audius/common/utils'
import { Id, OptionalId } from '@audius/sdk'
import { put, select, call, take, race } from 'typed-redux-saga'

import { getTrackOfflineDownloadStatus } from 'app/store/offline-downloads/selectors'
import {
  completeJob,
  errorJob,
  OfflineDownloadStatus,
  redownloadOfflineItems,
  removeOfflineItems,
  requestProcessNextJob,
  startJob
} from 'app/store/offline-downloads/slice'

import { shouldAbortJob } from '../../utils/shouldAbortJob'
import { shouldCancelJob } from '../../utils/shouldCancelJob'

export function* staleTrackWorker(trackId: ID) {
  yield* put(startJob({ type: 'stale-track', id: trackId }))
  const { jobResult, abortStaleTrack, abortJob, cancel } = yield* race({
    jobResult: call(handleStaleTrack, trackId),
    abortStaleTrack: call(shouldAbortStaleTrack, trackId),
    abortJob: call(shouldAbortJob),
    cancel: call(shouldCancelJob)
  })

  if (abortStaleTrack || abortJob) {
    yield* put(requestProcessNextJob())
  } else if (cancel) {
    // continue
  } else if (jobResult === OfflineDownloadStatus.ERROR) {
    yield* put(errorJob({ type: 'stale-track', id: trackId }))
    yield* put(requestProcessNextJob())
  } else if (jobResult === OfflineDownloadStatus.SUCCESS) {
    yield* put(
      completeJob({
        type: 'stale-track',
        id: trackId,
        verifiedAt: Date.now()
      })
    )
    yield* put(requestProcessNextJob())
  }
}

export function* handleStaleTrack(trackId: ID) {
  const sdk = yield* getSDK()
  const currentTrack = yield* queryTrack(trackId)
  const currentUserId = yield* call(queryCurrentUserId)

  if (!currentTrack || !currentUserId) return OfflineDownloadStatus.ERROR

  const { data } = yield* call([sdk.full.tracks, sdk.full.tracks.getTrack], {
    trackId: Id.parse(trackId),
    userId: OptionalId.parse(currentUserId)
  })
  const latestTrack = data ? userTrackMetadataFromSDK(data) : null

  if (!latestTrack) return OfflineDownloadStatus.ERROR

  if (dayjs(latestTrack.updated_at).isAfter(dayjs(currentTrack.updated_at))) {
    yield* put(
      redownloadOfflineItems({
        items: [{ type: 'track', id: trackId }]
      })
    )
  }

  return OfflineDownloadStatus.SUCCESS
}

function* shouldAbortStaleTrack(trackId: ID) {
  while (true) {
    yield* take(removeOfflineItems.type)
    const trackStatus = yield* select(getTrackOfflineDownloadStatus(trackId))
    if (!trackStatus) return true
  }
}
