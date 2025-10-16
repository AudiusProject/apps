import { useCurrentUserId, useTrack } from '~/api'
import { AccessType } from '~/models/AccessType'
import { ID } from '~/models/Identifiers'
import {
  isContentSpecialAccess,
  isContentTokenGated,
  isContentUSDCPurchaseGated
} from '~/models/Track'
import { Nullable } from '~/utils'

import { useGatedTrackAccess } from './useGatedContent'

type TrackAccessType = {
  type: Nullable<AccessType>
  isUnlocked?: boolean
  scheduledReleaseDate?: string
}

export const useTrackAccessTypeLabel = (trackId: ID): TrackAccessType => {
  const { data: track } = useTrack(trackId, {
    select: (track) => ({
      owner_id: track?.owner_id,
      stream_conditions: track?.stream_conditions,
      download_conditions: track?.download_conditions,
      release_date: track?.release_date,
      is_downloadable: track?.is_downloadable,
      is_unlisted: track?.is_unlisted
    })
  })

  const { data: userId } = useCurrentUserId()
  const isOwner = track?.owner_id === userId

  const { hasStreamAccess, hasDownloadAccess } = useGatedTrackAccess(trackId)

  const isUnlockedStream = !isOwner && hasStreamAccess
  const isUnlockedDownload = !isOwner && hasDownloadAccess
  const isPurchaseable = isContentUSDCPurchaseGated(track?.stream_conditions)
  const isTokenGated = isContentTokenGated(track?.stream_conditions)
  const isSpecialAccess = isContentSpecialAccess(track?.stream_conditions)
  const isDownloadGated = isContentUSDCPurchaseGated(track?.download_conditions)
  const isScheduledRelease =
    track?.release_date && new Date(track.release_date) > new Date()

  let type: Nullable<AccessType> = null
  let isUnlocked = false

  if (isScheduledRelease) {
    type = AccessType.SCHEDULED_RELEASE
  } else if (track?.is_unlisted) {
    type = AccessType.HIDDEN
  } else if (isPurchaseable) {
    type = AccessType.PREMIUM
    isUnlocked = isUnlockedStream
  } else if (isTokenGated) {
    type = AccessType.TOKEN_GATED
    isUnlocked = isUnlockedStream
  } else if (isSpecialAccess) {
    type = AccessType.SPECIAL_ACCESS
    isUnlocked = isUnlockedStream
  } else if (isDownloadGated) {
    type = AccessType.PREMIUM_EXTRAS
    isUnlocked = isUnlockedDownload
  } else if (track?.is_downloadable) {
    type = AccessType.EXTRAS
    isUnlocked = isUnlockedDownload
  }

  return {
    type,
    isUnlocked,
    scheduledReleaseDate:
      isScheduledRelease && track?.release_date ? track.release_date : undefined
  }
}
