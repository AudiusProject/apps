import type { ID } from '@audius/common/models'
import { dayjs } from '@audius/common/utils'
import { select } from 'typed-redux-saga'

import { getOfflineTrackMetadata } from '../selectors'

const STALE_DURATION_TRACKS = dayjs.duration(7, 'day')
const STALE_BATCH_SIZE = 20

export function* getStaleTracks() {
  const offlineTrackMetadata = yield* select(getOfflineTrackMetadata)

  const staleTracks = Object.keys(offlineTrackMetadata)
    .map((id) => parseInt(id, 10))
    .filter((trackId) => {
      const metadata = offlineTrackMetadata[trackId]
      if (!metadata?.last_verified_time) return false
      return dayjs()
        .subtract(STALE_DURATION_TRACKS)
        .isAfter(dayjs(metadata.last_verified_time))
    })
    .sort((trackIdA: ID, trackIdB: ID) => {
      const lastVerifiedA = offlineTrackMetadata[trackIdA].last_verified_time
      const lastVerifiedB = offlineTrackMetadata[trackIdB].last_verified_time

      if (!lastVerifiedB && !lastVerifiedA) return 0
      if (!lastVerifiedB) return -1
      if (!lastVerifiedA) return 1

      return lastVerifiedB - lastVerifiedA
    })
    .slice(0, STALE_BATCH_SIZE)
    .map((id) => ({
      type: 'stale-track' as const,
      id
    }))

  return staleTracks
}
