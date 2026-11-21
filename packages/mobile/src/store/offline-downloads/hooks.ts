import { useTracks } from '@audius/common/api'
import { removeNullable } from '@audius/common/utils'
import { useSelector } from 'react-redux'

import type { AppState } from 'app/store'

import { getOfflineTrackIds, getTrackOfflineMetadata } from './selectors'

export const useOfflineTracks = () => {
  const offlineTrackIds = useSelector(getOfflineTrackIds)
  const { byId } = useTracks(offlineTrackIds.map((id) => parseInt(id)))

  return offlineTrackIds
    .map((trackIdStr) => {
      const trackId = parseInt(trackIdStr)
      const track = byId[trackId]
      if (!track) return null
      const offlineMetadata = getTrackOfflineMetadata(trackId)({
        offlineDownloads: { offlineTrackMetadata: {} }
      } as AppState)
      return {
        ...track,
        offline: offlineMetadata || undefined
      }
    })
    .filter(removeNullable)
}
